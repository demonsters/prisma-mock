import { mockDeep } from "jest-mock-extended"
import { initPrismaMockLibrary } from "../src"

beforeAll(() => initPrismaMockLibrary({ mockDeep }))
