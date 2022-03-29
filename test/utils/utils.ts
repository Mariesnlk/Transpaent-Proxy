const { ether } = require('@openzeppelin/test-helpers')
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
require('@nomiclabs/hardhat-web3')
import { ethers } from 'hardhat'

export const a = (account: SignerWithAddress) => {
  return account.getAddress().then((res: string) => {
    return res.toString()
  })
}

export async function setCurrentTime(time: any): Promise<any> {
  return await ethers.provider.send('evm_mine', [time])
}
