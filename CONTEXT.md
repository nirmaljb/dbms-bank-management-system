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
