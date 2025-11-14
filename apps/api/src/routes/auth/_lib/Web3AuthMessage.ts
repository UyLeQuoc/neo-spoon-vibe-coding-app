export class Web3AuthMessage {
  constructor(
    public appName: string,
    public nonce: string
  ) {}

  toString() {
    return `Sign this message to authenticate with ${this.appName}.

Session: "${this.nonce}"
This request will not trigger any blockchain transaction or cost any gas.
`
  }

  static fromString(s: string) {
    const { x: appName } = s.match(/authenticate with (?<x>.+?)\./)?.groups ?? {}
    const { x: nonce } = s.match(/Session: "(?<x>.+?)"/)?.groups ?? {}
    if (!appName || !nonce) throw new Error('Invalid message format')

    return new Web3AuthMessage(appName, nonce)
  }
}
