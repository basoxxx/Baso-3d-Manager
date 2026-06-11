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

import type { Customer } from './db-types'

interface NewCustomer {
  name: string
  email: string
  phone: string | null
  address: string | null
  vat_number: string | null
  notes: string | null
}

export const ipc = {
  ping: () => call<string>('ping'),

  customers: {
    list: (search?: string) =>
      call<Customer[]>('list_customers', { search: search ?? null }),
    get: (id: string) => call<Customer>('get_customer', { id }),
    create: (input: NewCustomer) => call<Customer>('create_customer', { input }),
    update: (id: string, input: NewCustomer) =>
      call<Customer>('update_customer', { id, input }),
    delete: (id: string) => call<void>('delete_customer', { id }),
  },
}
