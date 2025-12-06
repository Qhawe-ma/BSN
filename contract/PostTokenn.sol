// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title PostToken
 * @dev BEP-20 compatible token contract for BSC Social Network posts
 * Fully on-chain storage - all post data is stored directly on the blockchain
 */
contract PostToken {
    string public name = "BSN Post Token";
    string public symbol = "BSNPOST";
    
    uint256 private _tokenIdCounter;
    
    struct PostData {
        string content;
        string imageUrl;
        uint256 timestamp;
        address author;
    }
    
    // Token ID => Owner address
    mapping(uint256 => address) private _owners;
    
    // Owner address => Token count
    mapping(address => uint256) private _balances;
    
    // Owner address => Token index => Token ID
    mapping(address => mapping(uint256 => uint256)) private _ownedTokens;
    
    // Token ID => Owner index
    mapping(uint256 => uint256) private _ownedTokensIndex;
    
    // Token ID => Metadata URI (IPFS hash) - kept for backwards compatibility
    mapping(uint256 => string) private _tokenURIs;
    
    // Token ID => Full Post Data (stored on-chain)
    mapping(uint256 => PostData) private _postData;
    
    event PostMinted(
        address indexed author, 
        uint256 indexed tokenId, 
        string metadataURI,
        string content,
        string imageUrl,
        uint256 timestamp
    );
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    
    /**
     * @dev Mint a new post token with full on-chain data
     * @param metadataURI IPFS URI containing post metadata (for compatibility)
     * @param content The actual post content text
     * @param imageUrl The image URL (IPFS or other)
     * @return tokenId The ID of the newly minted token
     */
    function mintWithData(
        string memory metadataURI,
        string memory content,
        string memory imageUrl
    ) public returns (uint256) {
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;
        
        _owners[tokenId] = msg.sender;
        _balances[msg.sender]++;
        
        uint256 length = _balances[msg.sender] - 1;
        _ownedTokens[msg.sender][length] = tokenId;
        _ownedTokensIndex[tokenId] = length;
        
        _tokenURIs[tokenId] = metadataURI;
        
        // Store full post data on-chain
        _postData[tokenId] = PostData({
            content: content,
            imageUrl: imageUrl,
            timestamp: block.timestamp,
            author: msg.sender
        });
        
        emit PostMinted(msg.sender, tokenId, metadataURI, content, imageUrl, block.timestamp);
        emit Transfer(address(0), msg.sender, tokenId);
        
        return tokenId;
    }
    
    /**
     * @dev Legacy mint function for backwards compatibility
     * @param metadataURI IPFS URI containing post metadata
     * @return tokenId The ID of the newly minted token
     */
    function mint(string memory metadataURI) public returns (uint256) {
        return mintWithData(metadataURI, "", "");
    }
    
    /**
     * @dev Get the full post data stored on-chain
     * @param tokenId The token ID
     * @return content The post text content
     * @return imageUrl The image URL
     * @return timestamp When the post was created
     * @return author The post author address
     */
    function getPostData(uint256 tokenId) public view returns (
        string memory content,
        string memory imageUrl,
        uint256 timestamp,
        address author
    ) {
        require(_owners[tokenId] != address(0), "Token does not exist");
        PostData memory post = _postData[tokenId];
        return (post.content, post.imageUrl, post.timestamp, post.author);
    }
    
    /**
     * @dev Get just the post content
     * @param tokenId The token ID
     * @return The post content text
     */
    function getContent(uint256 tokenId) public view returns (string memory) {
        require(_owners[tokenId] != address(0), "Token does not exist");
        return _postData[tokenId].content;
    }
    
    /**
     * @dev Get just the image URL
     * @param tokenId The token ID
     * @return The image URL
     */
    function getImageUrl(uint256 tokenId) public view returns (string memory) {
        require(_owners[tokenId] != address(0), "Token does not exist");
        return _postData[tokenId].imageUrl;
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
