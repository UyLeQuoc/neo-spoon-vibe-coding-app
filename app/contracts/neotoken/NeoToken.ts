import type { Neo3EventListener, Neo3EventListenerCallback, Neo3Invoker, Neo3Parser } from "@cityofzion/neon-dappkit-types"
import { TypeChecker } from "@cityofzion/neon-dappkit"
import * as Invocation from './api'

export type SmartContractConfig = {
  scriptHash: string;
  invoker: Neo3Invoker;
  parser?: Neo3Parser;
  eventListener?: Neo3EventListener | null;
}

export class NeoToken{
  static SCRIPT_HASH = '0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5'

  private config: Required<SmartContractConfig>

	constructor(configOptions: SmartContractConfig) {
		this.config = { 
			...configOptions, 
			parser: configOptions.parser ?? require("@cityofzion/neon-dappkit").NeonParser,
			eventListener: configOptions.eventListener ?? null
		}
	}

	async confirmTransferEvent(txId: string): Promise<void>{
		if (!this.config.eventListener) throw new Error('EventListener not provided')

		const txResult = await this.config.eventListener.waitForApplicationLog(txId)
		this.config.eventListener.confirmTransaction(
			txResult, {contract: this.config.scriptHash, eventname: 'Transfer'}
		)
	}

	listenTransferEvent(callback: Neo3EventListenerCallback): void{
		if (!this.config.eventListener) throw new Error('EventListener not provided')
		
		this.config.eventListener.addEventListener(this.config.scriptHash, 'Transfer', callback)
	}

	removeTransferEventListener(callback: Neo3EventListenerCallback): void{
		if (!this.config.eventListener) throw new Error('EventListener not provided')
		
		this.config.eventListener.removeEventListener(this.config.scriptHash, 'Transfer', callback)
	}

	async confirmCandidateStateChangedEvent(txId: string): Promise<void>{
		if (!this.config.eventListener) throw new Error('EventListener not provided')

		const txResult = await this.config.eventListener.waitForApplicationLog(txId)
		this.config.eventListener.confirmTransaction(
			txResult, {contract: this.config.scriptHash, eventname: 'CandidateStateChanged'}
		)
	}

	listenCandidateStateChangedEvent(callback: Neo3EventListenerCallback): void{
		if (!this.config.eventListener) throw new Error('EventListener not provided')
		
		this.config.eventListener.addEventListener(this.config.scriptHash, 'CandidateStateChanged', callback)
	}

	removeCandidateStateChangedEventListener(callback: Neo3EventListenerCallback): void{
		if (!this.config.eventListener) throw new Error('EventListener not provided')
		
		this.config.eventListener.removeEventListener(this.config.scriptHash, 'CandidateStateChanged', callback)
	}

	async confirmVoteEvent(txId: string): Promise<void>{
		if (!this.config.eventListener) throw new Error('EventListener not provided')

		const txResult = await this.config.eventListener.waitForApplicationLog(txId)
		this.config.eventListener.confirmTransaction(
			txResult, {contract: this.config.scriptHash, eventname: 'Vote'}
		)
	}

	listenVoteEvent(callback: Neo3EventListenerCallback): void{
		if (!this.config.eventListener) throw new Error('EventListener not provided')
		
		this.config.eventListener.addEventListener(this.config.scriptHash, 'Vote', callback)
	}

	removeVoteEventListener(callback: Neo3EventListenerCallback): void{
		if (!this.config.eventListener) throw new Error('EventListener not provided')
		
		this.config.eventListener.removeEventListener(this.config.scriptHash, 'Vote', callback)
	}

	async confirmCommitteeChangedEvent(txId: string): Promise<void>{
		if (!this.config.eventListener) throw new Error('EventListener not provided')

		const txResult = await this.config.eventListener.waitForApplicationLog(txId)
		this.config.eventListener.confirmTransaction(
			txResult, {contract: this.config.scriptHash, eventname: 'CommitteeChanged'}
		)
	}

	listenCommitteeChangedEvent(callback: Neo3EventListenerCallback): void{
		if (!this.config.eventListener) throw new Error('EventListener not provided')
		
		this.config.eventListener.addEventListener(this.config.scriptHash, 'CommitteeChanged', callback)
	}

	removeCommitteeChangedEventListener(callback: Neo3EventListenerCallback): void{
		if (!this.config.eventListener) throw new Error('EventListener not provided')
		
		this.config.eventListener.removeEventListener(this.config.scriptHash, 'CommitteeChanged', callback)
	}

	async balanceOf(params: { account: string } ): Promise<number>{
		const res = await this.config.invoker.testInvoke({
			invocations: [Invocation.balanceOfAPI(this.config.scriptHash, params, this.config.parser)],
			signers: [],
		})

		if (res.stack.length === 0) {
			throw new Error(res.exception ?? 'unrecognized response')
		}
		
		return this.config.parser.parseRpcResponse(res.stack[0], { type: 'Integer' })
	}

	async decimals(): Promise<number>{
		const res = await this.config.invoker.testInvoke({
			invocations: [Invocation.decimalsAPI(this.config.scriptHash)],
			signers: [],
		})

		if (res.stack.length === 0) {
			throw new Error(res.exception ?? 'unrecognized response')
		}
		
		return this.config.parser.parseRpcResponse(res.stack[0], { type: 'Integer' })
	}

	async getAccountState(params: { account: string } ): Promise<any[]>{
		const res = await this.config.invoker.testInvoke({
			invocations: [Invocation.getAccountStateAPI(this.config.scriptHash, params, this.config.parser)],
			signers: [],
		})

		if (res.stack.length === 0) {
			throw new Error(res.exception ?? 'unrecognized response')
		}
		
		return this.config.parser.parseRpcResponse(res.stack[0], { type: 'Array' })
	}

	async* getAllCandidates(itemsPerRequest: number = 20): AsyncGenerator<any[], void> {
		const res = await this.config.invoker.testInvoke({
			invocations: [Invocation.getAllCandidatesAPI(this.config.scriptHash)],
			signers: [],
		})

		if (res.stack.length !== 0 && res.session !== undefined && TypeChecker.isStackTypeInteropInterface(res.stack[0])) {

			let iterator = await this.config.invoker.traverseIterator(res.session, res.stack[0].id, itemsPerRequest)

			while (iterator.length !== 0){
				if (TypeChecker.isStackTypeInteropInterface(iterator[0])){
					throw new Error(res.exception ?? 'can not have an iterator inside another iterator')
				}else{
					const iteratorValues = iterator.map((item) => {
						return this.config.parser.parseRpcResponse(item)
					})

					yield iteratorValues
					iterator = await this.config.invoker.traverseIterator(res.session, res.stack[0].id, itemsPerRequest)
				}
			}
		}
		else {
			throw new Error(res.exception ?? 'unrecognized response')
		}
	}

	async getCandidateVote(params: { pubKey: string } ): Promise<number>{
		const res = await this.config.invoker.testInvoke({
			invocations: [Invocation.getCandidateVoteAPI(this.config.scriptHash, params, this.config.parser)],
			signers: [],
		})

		if (res.stack.length === 0) {
			throw new Error(res.exception ?? 'unrecognized response')
		}
		
		return this.config.parser.parseRpcResponse(res.stack[0], { type: 'Integer' })
	}

	async getCandidates(): Promise<any[]>{
		const res = await this.config.invoker.testInvoke({
			invocations: [Invocation.getCandidatesAPI(this.config.scriptHash)],
			signers: [],
		})

		if (res.stack.length === 0) {
			throw new Error(res.exception ?? 'unrecognized response')
		}
		
		return this.config.parser.parseRpcResponse(res.stack[0], { type: 'Array' })
	}

	async getCommittee(): Promise<any[]>{
		const res = await this.config.invoker.testInvoke({
			invocations: [Invocation.getCommitteeAPI(this.config.scriptHash)],
			signers: [],
		})

		if (res.stack.length === 0) {
			throw new Error(res.exception ?? 'unrecognized response')
		}
		
		return this.config.parser.parseRpcResponse(res.stack[0], { type: 'Array' })
	}

	async getCommitteeAddress(): Promise<string>{
		const res = await this.config.invoker.testInvoke({
			invocations: [Invocation.getCommitteeAddressAPI(this.config.scriptHash)],
			signers: [],
		})

		if (res.stack.length === 0) {
			throw new Error(res.exception ?? 'unrecognized response')
		}
		
		return this.config.parser.parseRpcResponse(res.stack[0], { type: 'Hash160' })
	}

	async getGasPerBlock(): Promise<number>{
		const res = await this.config.invoker.testInvoke({
			invocations: [Invocation.getGasPerBlockAPI(this.config.scriptHash)],
			signers: [],
		})

		if (res.stack.length === 0) {
			throw new Error(res.exception ?? 'unrecognized response')
		}
		
		return this.config.parser.parseRpcResponse(res.stack[0], { type: 'Integer' })
	}

	async getNextBlockValidators(): Promise<any[]>{
		const res = await this.config.invoker.testInvoke({
			invocations: [Invocation.getNextBlockValidatorsAPI(this.config.scriptHash)],
			signers: [],
		})

		if (res.stack.length === 0) {
			throw new Error(res.exception ?? 'unrecognized response')
		}
		
		return this.config.parser.parseRpcResponse(res.stack[0], { type: 'Array' })
	}

	async getRegisterPrice(): Promise<number>{
		const res = await this.config.invoker.testInvoke({
			invocations: [Invocation.getRegisterPriceAPI(this.config.scriptHash)],
			signers: [],
		})

		if (res.stack.length === 0) {
			throw new Error(res.exception ?? 'unrecognized response')
		}
		
		return this.config.parser.parseRpcResponse(res.stack[0], { type: 'Integer' })
	}

	async onNEP17Payment(params: { from: string, amount: number, data: any } ): Promise<string>{
		return await this.config.invoker.invokeFunction({
			invocations: [Invocation.onNEP17PaymentAPI(this.config.scriptHash, params, this.config.parser)],
			signers: [],
		})
	}

	async testOnNEP17Payment(params: { from: string, amount: number, data: any } ): Promise<void>{
		const res = await this.config.invoker.testInvoke({
			invocations: [Invocation.onNEP17PaymentAPI(this.config.scriptHash, params, this.config.parser)],
			signers: [],
		})

		if (res.stack.length === 0) {
			throw new Error(res.exception ?? 'unrecognized response')
		}
	}

	async registerCandidate(params: { pubkey: string } ): Promise<string>{
		return await this.config.invoker.invokeFunction({
			invocations: [Invocation.registerCandidateAPI(this.config.scriptHash, params, this.config.parser)],
			signers: [],
		})
	}

	async testRegisterCandidate(params: { pubkey: string } ): Promise<boolean>{
		const res = await this.config.invoker.testInvoke({
			invocations: [Invocation.registerCandidateAPI(this.config.scriptHash, params, this.config.parser)],
			signers: [],
		})

		if (res.stack.length === 0) {
			throw new Error(res.exception ?? 'unrecognized response')
		}
		
		return this.config.parser.parseRpcResponse(res.stack[0], { type: 'Boolean' })
	}

	async setGasPerBlock(params: { gasPerBlock: number } ): Promise<string>{
		return await this.config.invoker.invokeFunction({
			invocations: [Invocation.setGasPerBlockAPI(this.config.scriptHash, params, this.config.parser)],
			signers: [],
		})
	}

	async testSetGasPerBlock(params: { gasPerBlock: number } ): Promise<void>{
		const res = await this.config.invoker.testInvoke({
			invocations: [Invocation.setGasPerBlockAPI(this.config.scriptHash, params, this.config.parser)],
			signers: [],
		})

		if (res.stack.length === 0) {
			throw new Error(res.exception ?? 'unrecognized response')
		}
	}

	async setRegisterPrice(params: { registerPrice: number } ): Promise<string>{
		return await this.config.invoker.invokeFunction({
			invocations: [Invocation.setRegisterPriceAPI(this.config.scriptHash, params, this.config.parser)],
			signers: [],
		})
	}

	async testSetRegisterPrice(params: { registerPrice: number } ): Promise<void>{
		const res = await this.config.invoker.testInvoke({
			invocations: [Invocation.setRegisterPriceAPI(this.config.scriptHash, params, this.config.parser)],
			signers: [],
		})

		if (res.stack.length === 0) {
			throw new Error(res.exception ?? 'unrecognized response')
		}
	}

	async symbol(): Promise<string>{
		const res = await this.config.invoker.testInvoke({
			invocations: [Invocation.symbolAPI(this.config.scriptHash)],
			signers: [],
		})

		if (res.stack.length === 0) {
			throw new Error(res.exception ?? 'unrecognized response')
		}
		
		return this.config.parser.parseRpcResponse(res.stack[0], { type: 'String' })
	}

	async totalSupply(): Promise<number>{
		const res = await this.config.invoker.testInvoke({
			invocations: [Invocation.totalSupplyAPI(this.config.scriptHash)],
			signers: [],
		})

		if (res.stack.length === 0) {
			throw new Error(res.exception ?? 'unrecognized response')
		}
		
		return this.config.parser.parseRpcResponse(res.stack[0], { type: 'Integer' })
	}

	async transfer(params: { from: string, to: string, amount: number, data: any } ): Promise<string>{
		return await this.config.invoker.invokeFunction({
			invocations: [Invocation.transferAPI(this.config.scriptHash, params, this.config.parser)],
			signers: [],
		})
	}

	async testTransfer(params: { from: string, to: string, amount: number, data: any } ): Promise<boolean>{
		const res = await this.config.invoker.testInvoke({
			invocations: [Invocation.transferAPI(this.config.scriptHash, params, this.config.parser)],
			signers: [],
		})

		if (res.stack.length === 0) {
			throw new Error(res.exception ?? 'unrecognized response')
		}
		
		return this.config.parser.parseRpcResponse(res.stack[0], { type: 'Boolean' })
	}

	async unclaimedGas(params: { account: string, end: number } ): Promise<number>{
		const res = await this.config.invoker.testInvoke({
			invocations: [Invocation.unclaimedGasAPI(this.config.scriptHash, params, this.config.parser)],
			signers: [],
		})

		if (res.stack.length === 0) {
			throw new Error(res.exception ?? 'unrecognized response')
		}
		
		return this.config.parser.parseRpcResponse(res.stack[0], { type: 'Integer' })
	}

	async unregisterCandidate(params: { pubkey: string } ): Promise<string>{
		return await this.config.invoker.invokeFunction({
			invocations: [Invocation.unregisterCandidateAPI(this.config.scriptHash, params, this.config.parser)],
			signers: [],
		})
	}

	async testUnregisterCandidate(params: { pubkey: string } ): Promise<boolean>{
		const res = await this.config.invoker.testInvoke({
			invocations: [Invocation.unregisterCandidateAPI(this.config.scriptHash, params, this.config.parser)],
			signers: [],
		})

		if (res.stack.length === 0) {
			throw new Error(res.exception ?? 'unrecognized response')
		}
		
		return this.config.parser.parseRpcResponse(res.stack[0], { type: 'Boolean' })
	}

	async vote(params: { account: string, voteTo: string } ): Promise<string>{
		return await this.config.invoker.invokeFunction({
			invocations: [Invocation.voteAPI(this.config.scriptHash, params, this.config.parser)],
			signers: [],
		})
	}

	async testVote(params: { account: string, voteTo: string } ): Promise<boolean>{
		const res = await this.config.invoker.testInvoke({
			invocations: [Invocation.voteAPI(this.config.scriptHash, params, this.config.parser)],
			signers: [],
		})

		if (res.stack.length === 0) {
			throw new Error(res.exception ?? 'unrecognized response')
		}
		
		return this.config.parser.parseRpcResponse(res.stack[0], { type: 'Boolean' })
	}
}
