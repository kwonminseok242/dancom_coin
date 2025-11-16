// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract SimFiatStable is ERC20, Pausable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant REDEEM_ROLE = keccak256("REDEEM_ROLE");

    mapping(address => bool) public allowed; // 허용 지갑
    mapping(bytes32 => bool) public redeemFulfilled; // 상환 처리 여부

    event Minted(address indexed to, uint256 amount, string meta);
    event RedeemRequested(address indexed user, bytes32 requestId, uint256 amount, string meta);
    event RedeemFulfilled(bytes32 requestId, address indexed user, uint256 amount, string meta);

    constructor() ERC20("SimFiat", "sFIAT") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(REDEEM_ROLE, msg.sender);
        allowed[msg.sender] = true; // 운영사 기본 허용
    }

    // --- Admin ------------------------------------------------------------
    function setAllowed(address who, bool ok) external onlyRole(DEFAULT_ADMIN_ROLE) {
        allowed[who] = ok;
    }

    function grantMinter(address who) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(MINTER_ROLE, who);
    }

    function grantRedeemer(address who) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(REDEEM_ROLE, who);
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // --- Mint/Burn --------------------------------------------------------
    function mint(address to, uint256 amount, string calldata meta)
        external
        onlyRole(MINTER_ROLE)
        whenNotPaused
    {
        require(allowed[to], "recipient not allowed");
        _mint(to, amount);
        emit Minted(to, amount, meta);
    }

    /// @dev 사용자가 상환 요청을 올리면 이벤트만 발생(오프체인에서 처리)
    function requestRedeem(bytes32 requestId, uint256 amount, string calldata meta)
        external
        whenNotPaused
    {
        require(balanceOf(msg.sender) >= amount, "insufficient");
        emit RedeemRequested(msg.sender, requestId, amount, meta);
    }

    /// @dev 운영사(백오피스)가 오프체인 송금 후 호출 -> 토큰 소각
    function fulfillRedeem(bytes32 requestId, address user, uint256 amount, string calldata meta)
        external
        onlyRole(REDEEM_ROLE)
    {
        require(!redeemFulfilled[requestId], "already fulfilled");
        redeemFulfilled[requestId] = true;
        _burn(user, amount);
        emit RedeemFulfilled(requestId, user, amount, meta);
    }

    // --- Transfer guard (allowlist) --------------------------------------
    function _beforeTokenTransfer(address from, address to, uint256 amount)
        internal
        override
    {
        super._beforeTokenTransfer(from, to, amount);
        if (from != address(0) && to != address(0)) {
            require(allowed[from] && allowed[to], "transfer blocked");
        }
    }
}
