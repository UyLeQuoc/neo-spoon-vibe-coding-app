/**
 * This client-only module that contains everything related to auth and is used
 * to avoid importing `@webcontainer/api` in the server bundle.
 */

export { type AuthAPI, auth } from '@webcontainer/api'
