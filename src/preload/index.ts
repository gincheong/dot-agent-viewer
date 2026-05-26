// Phase A placeholder. Phase B will populate this with typed IPC channel wrappers
// for scanner:rescan, config:get-roots, action:*, and system:appearance.
import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('dotAgent', {})
