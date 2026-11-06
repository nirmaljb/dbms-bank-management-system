# Bank Management System

Core domain model for banking operations, user identity, and account management.

## Language

**User**:
An authenticated identity possessing system credentials and a security role.
_Avoid_: Account, Client, Profile

**Role**:
The authorization classification of a User within the system (`customer` or `admin`).
_Avoid_: Type, Permission, Level

**Customer**:
A User acting in the capacity of a bank patron who owns or operates financial accounts.
_Avoid_: Client, Member

**Account**:
A ledger-tracked financial entity holding monetary balances belonging to a Customer.
_Avoid_: User, Wallet

**Branch**:
A bank office identified by a 4-digit code. Every Account belongs to one Branch.

**IFSC**:
The 11-character code of a Branch (`BNBK` + `0` + branch code padded to 6), used with an account number to identify a payee.

**Application**:
An Account before an admin decides on it (`PENDING`, then `ACTIVE` or `REJECTED`). It has an application number but no account number.

**Admin ID**:
The staff identifier (`BNBA0001`) the database assigns to each admin, used to sign in to the admin portal.

**Transfer**:
Money moved from one Account to another of the same bank, recorded as a `TRANSFER_OUT` and a `TRANSFER_IN` ledger row.
