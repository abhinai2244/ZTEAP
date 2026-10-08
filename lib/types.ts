import { User, Role, Device, Resource, AccessRequest } from '@prisma/client'

export type SafeUser = Omit<User, 'passwordHash'>

export interface UserWithRoles extends SafeUser {
  userRoles: {
    role: Role
  }[]
}

export interface AccessRequestWithDetails extends AccessRequest {
  user: SafeUser
  resource: Resource
  device: Device
}
