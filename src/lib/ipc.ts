import { invoke } from '@tauri-apps/api/core'

export interface IpcError {
  code: string
  message: string
}

export class IpcException extends Error {
  code: string
  constructor(err: IpcError) {
    super(err.message)
    this.name = 'IpcException'
    this.code = err.code
  }
}

async function call<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(cmd, args)
  } catch (e) {
    if (typeof e === 'object' && e !== null && 'code' in e && 'message' in e) {
      throw new IpcException(e as IpcError)
    }
    throw e
  }
}

export const ipc = {
  ping: () => call<string>('ping'),
}
