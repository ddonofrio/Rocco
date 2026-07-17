export {
  LifecycleStateMachine,
  type DisposableResource,
  type Disposer,
  type Lifecycle,
  type LifecycleState,
  type ResourceScope,
} from './lifecycle';
export {
  adoptResource,
  createResourceScope,
  ResourceScopeClosedError,
  ResourceScopeDisposalError,
  ResourceScopeError,
  ResourceScopeImpl,
  type ResourceScopeDisposalErrorDetail,
  type ResourceScopeOptions,
} from './resource-scope';
