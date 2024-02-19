// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

interface IAccount {
    enum Command {
        ACCOUNT_MODIFY_MARGIN, //0
        ACCOUNT_WITHDRAW_ETH, //1
        PERP_CANCEL_ORDER, //2
        PERP_WITHDRAW_ALL_MARGIN, //3
        PERP_MODIFY_MARGIN, //4
        PERP_SUBMIT_CREATE_ORDER, //5
        PERP_SUBMIT_CLOSE_ORDER, //6
        DELEGATE_DEPOSIT_MARGIN, //7
        DELEGATE_RELEASE_FEE, //8
        GELATO_CREATE_TASK, //9
        GELETO_CANCEL_TASK //10
    }

    enum TaskCommand {
        STOP_LOSS //0
    }

    enum OrderStatus {
        PROCESSING,
        SUCCESS,
        FAILURE
    }

    struct AccountConstructorParams {
        address factory;
        address events;
        address configs;
        address marginAsset;
        address trustedForwarder;
        address automate;
        address taskCreator;
    }

    struct Order {
        uint256 size;
        uint256 fee;
        uint256 submittedTime;
        OrderStatus status;
    }

    struct Task {
        bytes32 gelatoTaskId;
        TaskCommand command;
        bytes32 market;
        int256 marginDelta;
        int256 sizeDelta;
        uint256 triggerPrice;
        uint256 desiredPrice;
        bytes32 options;
    }

    error LengthMismatch();

    error InvalidCommandType(uint256 commandType);

    error ZeroSizeDelta();

    error InsufficientAvailableMargin(uint256 available, uint256 required);

    error EthWithdrawalFailed();

    error FeeHasBeenReleased();

    error NoOrderFound();

    error FeeNotYetReleased();

    error CannotExecuteTask(uint256 taskId, address executor);

    function VERSION() external view returns (bytes32);

    function lockedMargin() external view returns (uint256);

    function lastOrders(
        address market
    )
        external
        view
        returns (
            uint256 size,
            uint256 fee,
            uint256 submittedTime,
            OrderStatus status
        );

    function executorUsdFee(uint256 _fee) external view returns (uint256);

    function availableMargin() external view returns (uint256);

    function getTask(uint256 _taskId) external view returns (Task memory);

    function setInitialOwnership(address _owner) external;

    function addInitialDelegate(address _delegate) external;

    function execute(
        Command[] calldata _commands,
        bytes[] calldata _inputs
    ) external payable;
}
