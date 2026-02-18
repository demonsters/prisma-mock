# prisma-mock

## 1.1.0

### Minor Changes

- 1560579: Add $clear function to clear state
- 4908115: Add $setInternalState method to manage internal state in createPrismaMock
- d827020: Automatic ID generation for MongoDB
- d827020: Support is / isNot filters in relation where clauses

### Patch Changes

- b8e4c87: Add unique constraint
- bb7e7fb: Add $clear into the return type

## 1.1.0-alpha.4

### Patch Changes

- b8e4c87: Add unique constraint

## 1.1.0-alpha.3

### Minor Changes

- d827020: Automatic ID generation for MongoDB
- d827020: Support is / isNot filters in relation where clauses

## 1.1.0-alpha.2

### Minor Changes

- 4908115: Add $setInternalState method to manage internal state in createPrismaMock

## 1.1.0-alpha.1

### Patch Changes

- bb7e7fb: Add $clear into the return type

## 1.1.0-alpha.0

### Minor Changes

- 1560579: Add $clear function to clear state

## 1.0.2

### Patch Changes

- dbb7861: Fix shallowCompare to handle date objects correctly

## 1.0.1

### Patch Changes

- 1cb3d6c: Add support for prisma v7

## 1.0.1-alpha.5

### Patch Changes

- dae2d1a: Try new build
- c76dbac: Fix build

## 1.0.1-alpha.4

### Patch Changes

- 6bef107: Add back NPM_TOKEN

## 1.0.1-alpha.3

### Patch Changes

- 914f68d: Update GitHub Actions workflow to use ubuntu-latest

## 1.0.1-alpha.2

### Patch Changes

- 0876510: Ensure npm 11.5.1 or later is installed

## 1.0.1-alpha.1

### Patch Changes

- e82ed1a: Update npm publish settings for oidc

## 1.0.1-alpha.0

### Patch Changes

- 1cb3d6c: Add support for prisma v7

## 1.0.0

### Major Changes

- 0b7a91e: Change the api interface & add dmmf generator

### Patch Changes

- d4a8818: Update createPrismaMock to make datamodel property optional, improving compatibility with Prisma DMMF.
- 29eaa9b: Add generic type parameter back to default createPrismaClient
- c621b0e: Improve datamodel handling
- d5637e1: Fix dmmf-generator
- 1a07011: Make datamodel optional when using default import
- 92ef1bc: Fix types
- d359764: Remove unneeded datamodel check in createPrismaClient
- ce2a428: Add missing @prisma/generator-helper dependancy
- b98101b: Use queryMatching for connect

## 1.0.0-alpha.9

### Patch Changes

- b98101b: Use queryMatching for connect

## 1.0.0-alpha.8

### Patch Changes

- c621b0e: Improve datamodel handling

## 1.0.0-alpha.7

### Patch Changes

- d4a8818: Update createPrismaMock to make datamodel property optional, improving compatibility with Prisma DMMF.

## 1.0.0-alpha.6

### Patch Changes

- 1a07011: Make datamodel optional when using default import

## 1.0.0-alpha.5

### Patch Changes

- 29eaa9b: Add generic type parameter back to default createPrismaClient

## 1.0.0-alpha.4

### Patch Changes

- d359764: Remove unneeded datamodel check in createPrismaClient

## 1.0.0-alpha.3

### Patch Changes

- 92ef1bc: Fix types

## 1.0.0-alpha.2

### Patch Changes

- ce2a428: Add missing @prisma/generator-helper dependancy

## 1.0.0-alpha.1

### Patch Changes

- d5637e1: Fix dmmf-generator

## 1.0.0-alpha.0

### Major Changes

- 0b7a91e: Change the api interface & add dmmf generator

## 0.12.2

### Patch Changes

- 739ff6a: Fix an issue where every did not work correctly

## 0.12.1

### Patch Changes

- 44ccf2d: correctly handle nested one-to-one updates and tidy tests

## 0.12.0

### Minor Changes

- 86b5525: Add indexes to increate performance (configurable with enableIndexes)

### Patch Changes

- ab157a0: Support @default(dbgenerated("gen_random_uuid()")) #23

## 0.11.2

### Patch Changes

- bb8b0e0: Add createManyAndReturn & updateManyAndReturn
