// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import {ERC2771Context} from "@gelatonetwork/relay-context/contracts/vendor/ERC2771Context.sol";

import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {Auth} from "contracts/utils/Auth.sol";
import {IAccount} from "contracts/interfaces/IAccount.sol";
import {IFactory} from "contracts/interfaces/IFactory.sol";
import {IConfigs} from "contracts/interfaces/IConfigs.sol";
import {IEvents} from "contracts/interfaces/IEvents.sol";
import {ITaskCreator} from "contracts/interfaces/ITaskCreator.sol";
import {IERC20} from "contracts/interfaces/token/IERC20.sol";
import {AutomateReady} from "contracts/utils/gelato/AutomateReady.sol";
import {Module, ModuleData} from "contracts/utils/gelato/Types.sol";

abstract contract Account is
    IAccount,
    Auth,
    ERC2771Context,
    AutomateReady,
    ReentrancyGuard
{
    bytes32 public constant VERSION = "0.1.0";
    bytes32 internal constant TRACKING_CODE = "COPIN";

    IFactory internal immutable FACTORY;
    IEvents internal immutable EVENTS;
    IConfigs internal immutable CONFIGS;
    IERC20 internal immutable MARGIN_ASSET;
    ITaskCreator internal immutable TASK_CREATOR;

    uint256 public lockedMargin;
    uint256 public taskId;
    mapping(address => Order) public lastOrders;
    mapping(uint256 => Task) internal _tasks;

    constructor(
        AccountConstructorParams memory _params
    )
        Auth(address(0))
        ERC2771Context(_params.trustedForwarder)
        AutomateReady(_params.automate, _params.taskCreator)
    {
        FACTORY = IFactory(_params.factory);
        EVENTS = IEvents(_params.events);
        CONFIGS = IConfigs(_params.configs);
        MARGIN_ASSET = IERC20(_params.marginAsset);
        TASK_CREATOR = ITaskCreator(_params.taskCreator);
    }

    function executorUsdFee(
        uint256 _fee
    ) public view virtual returns (uint256) {}

    function availableMargin() public view override returns (uint256) {
        return MARGIN_ASSET.balanceOf(address(this)) - lockedMargin;
    }

    function checker(
        uint256 _taskId
    ) external view returns (bool canExec, bytes memory execPayload) {
        canExec = _validTask(_taskId);

        // calldata for execute func
        execPayload = abi.encodeCall(this.executeTask, (_taskId));
    }

    function getTask(
        uint256 _taskId
    ) public view override returns (Task memory) {
        return _tasks[_taskId];
    }

    function setInitialOwnership(address _owner) external override {
        if (msg.sender != address(FACTORY)) revert Unauthorized();
        owner = _owner;
        _initAccount();
        emit OwnershipTransferred(address(0), _owner);
    }

    function addInitialDelegate(address _delegate) external override {
        if (msg.sender != address(FACTORY)) revert Unauthorized();
        delegates[_delegate] = true;
        emit DelegatedAccountAdded({caller: msg.sender, delegate: _delegate});
    }

    function transferOwnership(address _newOwner) public override {
        super.transferOwnership(_newOwner);
        FACTORY.updateAccountOwnership({
            _newOwner: _newOwner,
            _oldOwner: msg.sender
        });
    }

    function execute(
        Command[] calldata _commands,
        bytes[] calldata _inputs
    ) external payable override nonReentrant {
        uint256 numCommands = _commands.length;
        if (_inputs.length != numCommands) {
            revert LengthMismatch();
        }
        for (uint256 commandIndex = 0; commandIndex < numCommands; ) {
            _dispatch(_commands[commandIndex], _inputs[commandIndex]);
            unchecked {
                ++commandIndex;
            }
        }
        if (
            _commands.length == 1 &&
            (_commands[0] == Command.DELEGATE_RELEASE_FEE ||
                _commands[0] == Command.PERP_CANCEL_ORDER)
        ) return;
        address msgSender = _msgSender();
        if (msgSender != owner) {
            _chargeExecutorFee(msgSender);
        }
    }

    function executeTask(
        uint256 _taskId
    ) external nonReentrant onlyDedicatedMsgSender {
        Task memory task = getTask(_taskId);
        (_taskId);

        if (!_perpValidTask(task)) {
            revert CannotExecuteTask({taskId: _taskId, executor: msg.sender});
        }

        delete _tasks[_taskId];

        ITaskCreator(TASK_CREATOR).cancelTask(task.gelatoTaskId);

        uint256 fee = _chargeExecutorFee(address(TASK_CREATOR));

        _perpExecuteTask(task);

        EVENTS.emitGelatoTaskRunned({
            taskId: _taskId,
            gelatoTaskId: task.gelatoTaskId,
            fillPrice: task.triggerPrice,
            fee: fee
        });
    }

    function _dispatch(Command _command, bytes calldata _inputs) internal {
        uint256 commandIndex = uint256(_command);
        if (commandIndex < 2) {
            if (!isOwner(msg.sender)) revert Unauthorized();

            if (_command == Command.ACCOUNT_MODIFY_MARGIN) {
                int256 amount;
                assembly {
                    amount := calldataload(_inputs.offset)
                }
                _modifyAccountMargin({_amount: amount, _msgSender: msg.sender});
            } else if (_command == Command.ACCOUNT_WITHDRAW_ETH) {
                uint256 amount;
                assembly {
                    amount := calldataload(_inputs.offset)
                }
                _withdrawEth({_amount: amount, _msgSender: msg.sender});
            }
        } else {
            address msgSender = _msgSender();
            if (!isAuth(msgSender)) revert Unauthorized();
            if (_command == Command.PERP_CANCEL_ORDER) {
                address market = _perpCancelOrder(_inputs);
                _releaseProtocolFee(market, false);
            } else if (_command == Command.PERP_WITHDRAW_ALL_MARGIN) {
                _perpWithdrawAllMargin(_inputs);
            } else if (_command == Command.PERP_MODIFY_MARGIN) {
                _perpModifyMargin(_inputs);
            } else if (_command == Command.PERP_SUBMIT_CREATE_ORDER) {
                _perpSubmitCreateOrder(_inputs);
            } else if (_command == Command.PERP_SUBMIT_CLOSE_ORDER) {
                _perpSubmitCloseOrder(_inputs);
            } else if (_command == Command.DELEGATE_DEPOSIT_MARGIN) {
                uint256 amount;
                assembly {
                    amount := calldataload(_inputs.offset)
                }
                _depositMargin({_amount: amount});
            } else if (_command == Command.DELEGATE_RELEASE_FEE) {
                address market;
                assembly {
                    market := calldataload(_inputs.offset)
                }
                _delegateReleaseFee(market);
            } else if (_command == Command.GELATO_CREATE_TASK) {
                TaskCommand taskCommand;
                bytes32 market;
                int256 marginDelta;
                int256 sizeDelta;
                uint256 triggerPrice;
                uint256 desiredPrice;
                bytes32 options;
                assembly {
                    taskCommand := calldataload(_inputs.offset)
                    market := calldataload(add(_inputs.offset, 0x20))
                    marginDelta := calldataload(add(_inputs.offset, 0x40))
                    sizeDelta := calldataload(add(_inputs.offset, 0x60))
                    triggerPrice := calldataload(add(_inputs.offset, 0x80))
                    desiredPrice := calldataload(add(_inputs.offset, 0xa0))
                    options := calldataload(add(_inputs.offset, 0xc0))
                }
                _createGelatoTask({
                    _command: taskCommand,
                    _market: market,
                    _marginDelta: marginDelta,
                    _sizeDelta: sizeDelta,
                    _triggerPrice: triggerPrice,
                    _desiredPrice: desiredPrice,
                    _options: options
                });
            } else if (_command == Command.GELETO_CANCEL_TASK) {
                uint256 requestTaskId;
                assembly {
                    requestTaskId := calldataload(_inputs.offset)
                }
                _cancelGelatoTask(requestTaskId);
            }
            if (commandIndex > 10) {
                revert InvalidCommandType(commandIndex);
            }
        }
    }

    receive() external payable {}

    function _withdrawEth(uint256 _amount, address _msgSender) internal {
        if (_amount > 0) {
            (bool success, ) = payable(_msgSender).call{value: _amount}("");
            if (!success) revert EthWithdrawalFailed();

            EVENTS.emitEthWithdraw({user: _msgSender, amount: _amount});
        }
    }

    function _modifyAccountMargin(int256 _amount, address _msgSender) internal {
        // if amount is positive, deposit
        if (_amount > 0) {
            /// @dev failed Synthetix asset transfer will revert and not return false if unsuccessful
            MARGIN_ASSET.transferFrom(_msgSender, address(this), _abs(_amount));

            EVENTS.emitDeposit({user: _msgSender, amount: _abs(_amount)});
        } else if (_amount < 0) {
            // if amount is negative, withdraw
            _sufficientMargin(_amount);

            /// @dev failed Synthetix asset transfer will revert and not return false if unsuccessful
            MARGIN_ASSET.transfer(_msgSender, _abs(_amount));

            EVENTS.emitWithdraw({user: _msgSender, amount: _abs(_amount)});
        }
    }

    function _depositMargin(uint256 _amount) internal {
        MARGIN_ASSET.transferFrom(owner, address(this), _amount);
        EVENTS.emitDeposit({user: owner, amount: _amount});
    }

    function _chargeExecutorFee(address _executor) internal returns (uint256) {
        uint256 _fee;
        if (_executor == address(TASK_CREATOR)) {
            (_fee, ) = automate.getFeeDetails();
        } else {
            _fee = CONFIGS.executorFee();
        }
        uint256 _feeUsd = executorUsdFee(_fee);
        address _feeReceiver = CONFIGS.feeReceiver();
        if (_feeUsd <= availableMargin()) {
            /// @dev failed Synthetix asset transfer will revert and not return false if unsuccessful
            MARGIN_ASSET.transfer(_feeReceiver, _feeUsd);
        } else {
            /// @dev failed Synthetix asset transfer will revert and not return false if unsuccessful
            MARGIN_ASSET.transferFrom(owner, _feeReceiver, _feeUsd);
        }
        EVENTS.emitChargeExecutorFee({
            executor: _executor,
            receiver: _feeReceiver,
            fee: _fee,
            feeUsd: _feeUsd
        });
        return _fee;
    }

    function _lockProtocolFee(uint256 _fee) internal {
        if (_fee > availableMargin()) {
            revert InsufficientAvailableMargin(availableMargin(), _fee);
        }
        lockedMargin += _fee;
    }

    function _releaseProtocolFee(address _market, bool _success) internal {
        Order storage order = lastOrders[_market];
        if (order.size == 0 || order.status != OrderStatus.PROCESSING) {
            return;
        }
        if (_success) {
            address _feeReceiver = CONFIGS.feeReceiver();
            MARGIN_ASSET.transfer(_feeReceiver, order.fee);
            EVENTS.emitChargeProtocolFee({
                receiver: _feeReceiver,
                size: order.size,
                fee: order.fee
            });
        }
        lockedMargin -= order.fee;
        order.status = _success ? OrderStatus.SUCCESS : OrderStatus.FAILURE;
    }

    function _delegateReleaseFee(address _market) internal {
        Order storage order = lastOrders[_market];
        if (order.size == 0) {
            revert NoOrderFound();
        }
        if (order.status != OrderStatus.PROCESSING) {
            revert FeeHasBeenReleased();
        }
        if (order.submittedTime + 7 * 24 * 3600 > block.timestamp) {
            revert FeeNotYetReleased();
        }
        _releaseProtocolFee(_market, true);
    }

    function _preOrder(address _market, uint256 _size) internal {
        _releaseProtocolFee(_market, true);
    }

    function _postOrder(address _market, uint256 _size) internal {
        uint256 _fee = _protocolUsdFee(_size);
        _lockProtocolFee(_fee);
        lastOrders[_market] = Order({
            size: _size,
            fee: _fee,
            submittedTime: block.timestamp,
            status: OrderStatus.PROCESSING
        });
    }

    function _perpCancelOrder(
        bytes calldata _inputs
    ) internal virtual returns (address market) {}

    function _perpWithdrawAllMargin(bytes calldata _inputs) internal virtual {}

    function _perpModifyMargin(bytes calldata _inputs) internal virtual {}

    function _perpSubmitCreateOrder(bytes calldata _inputs) internal virtual {}

    function _perpSubmitCloseOrder(bytes calldata _inputs) internal virtual {}

    function _perpValidTask(
        Task memory _task
    ) internal view virtual returns (bool) {}

    function _perpExecuteTask(Task memory _task) internal virtual {}

    function _createGelatoTask(
        TaskCommand _command,
        bytes32 _market,
        int256 _marginDelta,
        int256 _sizeDelta,
        uint256 _triggerPrice,
        uint256 _desiredPrice,
        bytes32 _options
    ) internal {
        if (_sizeDelta == 0) revert ZeroSizeDelta();
        if (_marginDelta > 0) {
            _sufficientMargin(_marginDelta);
            lockedMargin += _abs(_marginDelta);
        }

        ModuleData memory moduleData = ModuleData({
            modules: new Module[](1),
            args: new bytes[](1)
        });

        moduleData.modules[0] = Module.RESOLVER;
        moduleData.args[0] = abi.encode(
            address(this),
            abi.encodeCall(this.checker, taskId)
        );

        bytes32 _gelatoTaskId = ITaskCreator(TASK_CREATOR).createTask({
            execData: abi.encodeCall(this.executeTask, taskId),
            moduleData: moduleData,
            feeToken: ETH
        });

        _tasks[taskId] = Task({
            gelatoTaskId: _gelatoTaskId,
            command: _command,
            market: _market,
            marginDelta: _marginDelta,
            sizeDelta: _sizeDelta,
            triggerPrice: _triggerPrice,
            desiredPrice: _desiredPrice,
            options: _options
        });

        EVENTS.emitCreateGelatoTask({
            taskId: taskId,
            gelatoTaskId: _gelatoTaskId,
            command: _command,
            market: _market,
            marginDelta: _marginDelta,
            sizeDelta: _sizeDelta,
            triggerPrice: _triggerPrice,
            desiredPrice: _desiredPrice,
            options: _options
        });

        ++taskId;
    }

    function _cancelGelatoTask(uint256 _taskId) internal {
        Task memory task = getTask(_taskId);
        ITaskCreator(TASK_CREATOR).cancelTask(task.gelatoTaskId);
    }

    function _initAccount() internal virtual {}

    function _protocolUsdFee(uint256 _size) internal view returns (uint256) {
        return _size / IConfigs(CONFIGS).protocolFee();
    }

    function _sufficientMargin(int256 _marginOut) internal view {
        if (_abs(_marginOut) > availableMargin()) {
            revert InsufficientAvailableMargin(
                availableMargin(),
                _abs(_marginOut)
            );
        }
    }

    function _validTask(uint256 _taskId) internal view returns (bool) {
        Task memory task = getTask(_taskId);

        if (task.market == bytes32(0)) {
            return false;
        }
        return _perpValidTask(task);
    }

    // function _orderKey(
    //     address _market,
    //     uint256 _intentionTime
    // ) internal pure returns (bytes32) {
    //     return keccak256(abi.encodePacked(_market, _intentionTime));
    // }

    function _abs(int256 x) internal pure returns (uint256 z) {
        assembly {
            let mask := sub(0, shr(255, x))
            z := xor(mask, add(mask, x))
        }
    }

    function _isSameSign(int256 x, int256 y) internal pure returns (bool) {
        assert(x != 0 && y != 0);
        return (x ^ y) >= 0;
    }
}
