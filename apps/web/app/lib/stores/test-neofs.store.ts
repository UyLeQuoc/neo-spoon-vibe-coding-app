import { map } from 'nanostores'

export type StepStatus = 'pending' | 'active' | 'completed' | 'error'

export interface StepResult {
  [key: number]: any
}

export interface StepError {
  [key: number]: string
}

export const testNeoFSStore = map({
  // Step management
  currentStep: 1,
  loading: false,
  stepResults: {} as StepResult,
  stepErrors: {} as StepError,

  // Form states
  containerName: '',
  placementPolicy: 'REP 2',
  basicAcl: 'eacl-public-read-write',
  file: null as File | null,
  fileName: '',

  // Generated IDs
  containerId: '',
  objectId: ''
})

// Helper functions to update store
export function setCurrentStep(step: number) {
  testNeoFSStore.setKey('currentStep', step)
}

export function setLoading(loading: boolean) {
  testNeoFSStore.setKey('loading', loading)
}

export function setStepResult(step: number, result: any) {
  const current = testNeoFSStore.get()
  testNeoFSStore.setKey('stepResults', {
    ...current.stepResults,
    [step]: result
  })
}

export function setStepError(step: number, error: string) {
  const current = testNeoFSStore.get()
  testNeoFSStore.setKey('stepErrors', {
    ...current.stepErrors,
    [step]: error
  })
}

export function clearStepError(step: number) {
  const current = testNeoFSStore.get()
  const newErrors = { ...current.stepErrors }
  delete newErrors[step]
  testNeoFSStore.setKey('stepErrors', newErrors)
}

export function setContainerName(name: string) {
  testNeoFSStore.setKey('containerName', name)
}

export function setPlacementPolicy(policy: string) {
  testNeoFSStore.setKey('placementPolicy', policy)
}

export function setBasicAcl(acl: string) {
  testNeoFSStore.setKey('basicAcl', acl)
}

export function setFile(file: File | null) {
  testNeoFSStore.setKey('file', file)
}

export function setFileName(name: string) {
  testNeoFSStore.setKey('fileName', name)
}

export function setContainerId(id: string) {
  testNeoFSStore.setKey('containerId', id)
}

export function setObjectId(id: string) {
  testNeoFSStore.setKey('objectId', id)
}

export function resetStore() {
  testNeoFSStore.set({
    currentStep: 1,
    loading: false,
    stepResults: {},
    stepErrors: {},
    containerName: '',
    placementPolicy: 'REP 2',
    basicAcl: 'eacl-public-read-write',
    file: null,
    fileName: '',
    containerId: '',
    objectId: ''
  })
}

