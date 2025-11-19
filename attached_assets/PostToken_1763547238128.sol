// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title PostToken
 * @dev BEP-20 compatible token contract for BSC Social Network posts
 * Each token represents a unique post with IPFS metadata
 */
contract PostToken {
    string public name = "BSC Social Post";
    string public symbol = "BSCPOST";
    
    uint256 private _tokenIdCounter;
    
    // Token ID => Owner address
    mapping(uint256 => address) private _owners;
    
    // Owner address => Token count
    mapping(address => uint256) private _balances;
    
    // Owner address => Token index => Token ID
    mapping(address => mapping(uint256 => uint256)) private _ownedTokens;
    
    // Token ID => Owner index
    mapping(uint256 => uint256) private _ownedTokensIndex;
    
    // Token ID => Metadata URI (IPFS hash)
    mapping(uint256 => string) private _tokenURIs;
    
    event PostMinted(address indexed author, uint256 indexed tokenId, string metadataURI);
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    
    /**
     * @dev Mint a new post token
     * @param metadataURI IPFS URI containing post metadata
     * @return tokenId The ID of the newly minted token
     */
    function mint(string memory metadataURI) public returns (uint256) {
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;
        
        _owners[tokenId] = msg.sender;
        _balances[msg.sender]++;
        
        uint256 length = _balances[msg.sender] - 1;
        _ownedTokens[msg.sender][length] = tokenId;
        _ownedTokensIndex[tokenId] = length;
        
        _tokenURIs[tokenId] = metadataURI;
        
        emit PostMinted(msg.sender, tokenId, metadataURI);
        emit Transfer(address(0), msg.sender, tokenId);
        
        return tokenId;
    }
    
    /**
     * @dev Get the metadata URI for a token
     * @param tokenId The token ID
     * @return The IPFS metadata URI
     */
    function tokenURI(uint256 tokenId) public view returns (string memory) {
        require(_owners[tokenId] != address(0), "Token does not exist");
        return _tokenURIs[tokenId];
    }
    
    /**
     * @dev Get the owner of a token
     * @param tokenId The token ID
     * @return The owner address
     */
    function ownerOf(uint256 tokenId) public view returns (address) {
        address owner = _owners[tokenId];
        require(owner != address(0), "Token does not exist");
        return owner;
    }
    
    /**
     * @dev Get the balance of an owner
     * @param owner The owner address
     * @return The number of tokens owned
     */
    function balanceOf(address owner) public view returns (uint256) {
        require(owner != address(0), "Invalid address");
        return _balances[owner];
    }
    
    /**
     * @dev Get total number of tokens minted
     * @return The total supply
     */
    function totalSupply() public view returns (uint256) {
        return _tokenIdCounter;
    }
    
    /**
     * @dev Get token ID owned by address at a given index
     * @param owner The owner address
     * @param index The index in the owner's token list
     * @return The token ID
     */
    function tokenOfOwnerByIndex(address owner, uint256 index) public view returns (uint256) {
        require(index < _balances[owner], "Index out of bounds");
        return _ownedTokens[owner][index];
    }
}
