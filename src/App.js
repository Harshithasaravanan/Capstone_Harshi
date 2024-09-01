import React, { useState, useEffect } from "react";
import { pinata } from "./config";
import { ethers } from "ethers";
import "./App.css";

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [ipfsHash, setIpfsHash] = useState("");
  const [storedHash, setStoredHash] = useState("");
  const [hashExists, setHashExists] = useState(false); // New state variable

  const contractAddress = "0x433e27a51c005ce8bc23db35b49c446383c9cbf5";
  const contractABI = [
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "_ipfshash",
          "type": "string"
        }
      ],
      "name": "setIPFSHash",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "_ipfshash",
          "type": "string"
        }
      ],
      "name": "checkIPFSHash",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getIPFSHash",
      "outputs": [
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ];

  useEffect(() => {
    const initializeMetaMask = async () => {
      if (window.ethereum) {
        try {
          await window.ethereum.request({ method: 'eth_requestAccounts' });
          console.log("MetaMask is ready and accounts have been requested.");
        } catch (error) {
          console.error("User denied account access", error);
        }
      } else {
        console.error("MetaMask is not installed.");
      }
    };

    initializeMetaMask();
  }, []);

  const changeHandler = (event) => {
    setSelectedFile(event.target.files[0]);
    setHashExists(false); // Reset hashExists when selecting a new file
  };

  const handleSubmission = async () => {
    try {
      if (!selectedFile) {
        console.error("No file selected");
        return;
      }

      const response = await pinata.upload.file(selectedFile);
      const ipfsHash = response.IpfsHash;
      setIpfsHash(ipfsHash);

      await storeHashOnBlockchain(ipfsHash);
    } catch (error) {
      console.log("File upload failed:", error);
    }
  };

  const storeHashOnBlockchain = async (hash) => {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractABI, signer);

      console.log("Checking if hash exists on blockchain...");
      const hashExistsOnBlockchain = await contract.checkIPFSHash(hash);

      console.log("Hash exists check result:", hashExistsOnBlockchain);
      if (hashExistsOnBlockchain) {
        console.log("Hash already exists in the blockchain.");
        setHashExists(true); // Set the state to true if the hash exists
        return; // Exit the function if the hash already exists
      }

      console.log("Storing hash on blockchain...");
      const tx = await contract.setIPFSHash(hash);
      console.log("Transaction sent:", tx);

      await tx.wait();
      console.log("IPFS hash stored on blockchain:", hash);
    } catch (error) {
      console.error("Failed to store IPFS hash on blockchain:", error);
    }
  };

  const retrieveHashFromBlockchain = async () => {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const contract = new ethers.Contract(contractAddress, contractABI, provider);

      const retrievedHash = await contract.getIPFSHash();
      setStoredHash(retrievedHash);

      console.log("Retrieved IPFS hash from blockchain:", retrievedHash);
    } catch (error) {
      console.log("Failed to retrieve IPFS hash from blockchain:", error);
    }
  };
  
  return (
    <div className="app-container">
      <div className="upload-section">
        <label className="form-label">Choose File</label>
        <input type="file" onChange={changeHandler} className="file-input" />
        <button onClick={handleSubmission} className="submit-button">
          Submit
        </button>
      </div>

      {hashExists && (
        <div className="alert-section">
          <p className="alert-message">This file already exists on the blockchain.</p>
        </div>
      )}

      {ipfsHash && (
        <div className="result-section">
          <p>
            <strong>IPFS Hash:</strong> {ipfsHash}
          </p>
        </div>
      )}

      <div className="retrieve-section">
        <button onClick={retrieveHashFromBlockchain} className="retrieve-button">
          Retrieve Stored Hash
        </button>
        {storedHash && (
          <div>
            <p>
              <strong>Stored IPFS Hash:</strong> {storedHash}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
