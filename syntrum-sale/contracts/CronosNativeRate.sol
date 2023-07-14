pragma solidity ^0.8.13;

interface IStdReference {
    /// A structure returned whenever someone requests for standard reference data.
    struct ReferenceData {
        uint256 rate; // base/quote exchange rate, multiplied by 1e18.
        uint256 lastUpdatedBase; // UNIX epoch of the last time when base price gets updated.
        uint256 lastUpdatedQuote; // UNIX epoch of the last time when quote price gets updated.
    }

    /// Returns the price data for the given base/quote pair. Revert if not available.
    function getReferenceData(string memory _base, string memory _quote)
    external
    view
    returns (ReferenceData memory);

    /// Similar to getReferenceData, but with multiple base/quote pairs at once.
    function getReferenceDataBulk(string[] memory _bases, string[] memory _quotes)
    external
    view
    returns (ReferenceData[] memory);
}

contract CronosNativeRate {
    IStdReference ref;

    constructor(IStdReference _ref) {
        ref = _ref;
    }

    function getUsdRate(
        address contractAddress
    ) external view returns (uint256) {
        require(contractAddress == address(0), 'Unsupported token');
        IStdReference.ReferenceData memory data = ref.getReferenceData("CRO", "USD");
        return data.rate;
    }
}