/* 
javascript library for NODEJS
Version 0.10
*/
import EIP712Helper from "./EIP712Helper.js" 
import web3utils from 'web3-utils'
 
import ethSigUtil from 'eth-sig-util'
import {bufferToHex, toBuffer, fromRpcSig, ecrecover, pubToAddress} from 'ethereumjs-util'
import FileHelper from './file-helper.js'
 

//"BidPacket(address bidderAddress,address nftContractAddress,address currencyTokenAddress,uint256 currencyTokenAmount,uint256 expires)"
  
const OrderPacketConfig = 
{   "contractName":"BlockStore",
"version":"1",
"primaryType":"OffchainOrder",
"entries":{
    "orderCreator":"address",
    "isSellOrder":"bool",
    "nftContractAddress":"address",
    "nftTokenId":"uint256",
    "currencyTokenAddress":"address",
    "currencyTokenAmount":"uint256",
    "nonce":"bytes32",
    "expires":"uint256"
 }
}


export default class EIP712Utils {
 
/*
    static getBidPacket(
        bidderAddress,nftContractAddress,currencyTokenAddress,currencyTokenAmount,requireProjectId,projectId,expires,signature)
    {

      return {
        bidderAddress:bidderAddress,
        nftContractAddress: nftContractAddress,
        currencyTokenAddress: currencyTokenAddress,
        currencyTokenAmount: currencyTokenAmount,
        expires:expires,
        requireProjectId: requireProjectId,
        projectId: projectId,
        signature:signature
      }


    }*/
 
  /// "\x19\x01",
  ///  getEIP712DomainHash('BuyTheFloor','1',_chain_id,address(this)),
   /// getBidPacketHash(bidderAddress,nftContractAddress,currencyTokenAddress,currencyTokenAmount,expires)
      static getTypedDataHash(typedData)
      {
        var typedDatahash = web3utils.soliditySha3(
          Buffer.concat([
              Buffer.from('1901', 'hex'),
              EIP712Helper.structHash('EIP712Domain', typedData.domain, typedData.types),
              EIP712Helper.structHash(typedData.primaryType, typedData.message, typedData.types),
          ]),
      );

        
           return typedDatahash;
      }
 

      static getTypedDataHashMetamask(typedData)
      {
        var typedDataHash = web3utils.soliditySha3(
                "\x19\x01",
                EIP712Helper.structHash('EIP712Domain', typedData.domain, typedData.types),
                EIP712Helper.structHash(typedData.primaryType, typedData.message, typedData.types),
           
        ); 
        
         return typedDataHash;
      }


     static recoverPacketSigner(  typedData, signature){

      console.log('signature',signature)

       var sigHash = EIP712Utils.getTypedDataHash( typedData, typedData.types);
       var msgBuf = toBuffer(signature)
       const res = fromRpcSig(msgBuf);


       var hashBuf = toBuffer(sigHash)

       const pubKey  = ecrecover(hashBuf, res.v, res.r, res.s);
       const addrBuf = pubToAddress(pubKey);
       const recoveredSignatureSigner    = bufferToHex(addrBuf);

       var message = typedData.message

       console.log('recovered signer pub address',recoveredSignatureSigner.toLowerCase())
       //make sure the signer is the depositor of the tokens
       return recoveredSignatureSigner.toLowerCase();

     }




     static signTypedData(privateKey, typedData)
    {

      const msgHash = ethSigUtil.typedSignatureHash(typedData)
       

      var msgBuffer= ethUtil.toBuffer(msgHash)

      const sig = ethUtil.ecsign(msgBuffer, privateKey)
      return ethUtil.bufferToHex(ethSigUtil.concatSig(sig.v, sig.r, sig.s))

    }

   

    static getTypedDataFromParams( _chainId,_contractAddress, customConfig, dataValues)
    {



      var typedData = {
              types: {
                  EIP712Domain: [
                      { name: "contractName", type: "string" },
                      { name: "version", type: "string" },
                      { name: "chainId", type: "uint256" },
                      { name: "verifyingContract", type: "address" }
                  ]
              },
              primaryType: customConfig.primaryType,
              domain: {
                  contractName: customConfig.contractName,
                  version: customConfig.version,
                  chainId: _chainId,  
                  verifyingContract: web3utils.toChecksumAddress(_contractAddress)
              },
              message: dataValues  
          };

          typedData.types[customConfig.primaryType] = []

          for(let [key,value] of Object.entries(customConfig.entries)){
            typedData.types[customConfig.primaryType].push( {name:key, type: value} )
          } 


        return typedData;
    }
 



      static formatAmountWithDecimals(amountRaw,decimals)
      {
      var amountFormatted = amountRaw / (Math.pow(10,decimals) * 1.0)
 
      return amountFormatted;
    }



  

        //updating to spec
        // https://github.com/ethereum/EIPs/blob/master/EIPS/eip-712.md

        //https://github.com/ethereum/EIPs/blob/master/assets/eip-712/Example.sol

      static getEIP712TypedData()
      {

        return {
          type: 'object',
          properties: {
            types: {
              type: 'object',
              properties: {
                EIP712Domain: {type: 'array'},
              },
              additionalProperties: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: {type: 'string'},
                    type: {type: 'string'}
                  },
                  required: ['name', 'type']
                }
              },
              required: ['EIP712Domain']
            },
            primaryType: {type: 'string'},
            domain: {type: 'object'},
            message: {type: 'object'}
          },
          required: ['types', 'primaryType', 'domain', 'message']
        }



      }



     static async performOffchainSignForPacket(chainId, contractAddress,customConfig, dataValues, web3, from){

          
 
       const typedData = EIP712Utils.getTypedDataFromParams(
             
            chainId,  
            contractAddress,
            customConfig,
             {
              orderCreator: dataValues.orderCreator,
              isSellOrder: dataValues.isSellOrder,
              nftContractAddress: dataValues.nftContractAddress,
              nftTokenId: dataValues.nftTokenId,
              currencyTokenAddress: dataValues.currencyTokenAddress,
              currencyTokenAmount: dataValues.currencyTokenAmount,
              nonce: dataValues.nonce,
              expires: dataValues.expires,

             }  
       )
        
 
        var stringifiedData = JSON.stringify(  typedData );

        console.log('meep',stringifiedData)

        
        let typedDatahash = EIP712Utils.getTypedDataHash(typedData)

        console.log('typedDatahash',typedDatahash)
        let signResult = await  EIP712Helper.signTypedData( web3, from, stringifiedData  )
        
        
        
        console.log( 'signResult', signResult )  


        let recoveredSigner = EIP712Utils.recoverPacketSigner(typedData, signResult.signature)
        console.log('recoveredSigner', recoveredSigner )
   


        return signResult



  }

  static recoverOrderSigner(  inputData  ){
 
 
    const typedData = EIP712Utils.getTypedDataFromParams( 
           inputData.chainId,  
         inputData.storeContractAddress,
         OrderPacketConfig,
         {
          orderCreator: inputData.orderCreator,
          isSellOrder: inputData.isSellOrder,
          nftContractAddress: inputData.nftContractAddress,
          nftTokenId: inputData.nftTokenId,
          currencyTokenAddress: inputData.currencyTokenAddress,
          currencyTokenAmount: inputData.currencyTokenAmount,
          nonce: inputData.nonce,
          expires: inputData.expires,

         }    
    ) 
     
   

     let recoveredSigner = EIP712Utils.recoverPacketSigner(typedData, inputData.signature)
     console.log('recoveredSigner', recoveredSigner )
 

     return recoveredSigner 


}


/*
  let sellParams = {
          
    nftTokenAddress: this.selectedBidPacket.nftTokenAddress,
    tokenId: this.ownedTokenIdToSell, 
    from: this.web3Plug.getActiveAccountAddress(),
    to:  this.selectedBidPacket.bidderAddress,
    currencyToken: this.selectedBidPacket.currencyTokenAddress,
    currencyAmount: this.selectedBidPacket.currencyTokenAmount,
    expires: this.selectedBidPacket.expires,
    buyerSignature: this.selectedBidPacket.signature


   }*/

     
}
