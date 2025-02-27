/*
import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
 */
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { FavoriteNumber } from "../target/types/favorite_number";
import { expect } from "chai";

describe("favorite_number", () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.FavoriteNumber as Program<FavoriteNumber>;
  
  // Generate keypairs for our tests
  const admin = anchor.web3.Keypair.generate();
  const user1 = anchor.web3.Keypair.generate();
  const user2 = anchor.web3.Keypair.generate();
  
  // Find PDA for program state
  const [statePda] = anchor.web3.PublicKey.findProgramAddressSync(
    // [],
    [Buffer.from("state")],
    program.programId
  );
  
  // Helper function to get user info PDA
  const getUserInfoPda = (user: anchor.web3.PublicKey) => {
    return anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("user-info"), user.toBuffer()],
      program.programId
    )[0];
  };

  // Fund accounts with SOL for transaction fees
  before(async () => {
    // Airdrop SOL to admin and users for transaction fees
    const airdropAmount = 2 * anchor.web3.LAMPORTS_PER_SOL;
    
    await provider.connection.requestAirdrop(admin.publicKey, airdropAmount);
    await provider.connection.requestAirdrop(user1.publicKey, airdropAmount);
    await provider.connection.requestAirdrop(user2.publicKey, airdropAmount);
    
    // Wait for confirmation
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  it("Initializes the program with the correct admin", async () => {
    // Initialize the program state with admin
    await program.methods
      .initialize()
      .accounts({
        state: statePda,
        admin: admin.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([admin])
      .rpc();

    // Fetch the state and verify admin is set correctly
    const stateAccount = await program.account.programState.fetch(statePda);
    expect(stateAccount.admin.toString()).to.equal(admin.publicKey.toString());
  });

  it("Allows a user to set their favorite number", async () => {
    const user1InfoPda = getUserInfoPda(user1.publicKey);
    const user1FavoriteNumber = new anchor.BN(42);

    // User1 sets their favorite number
    await program.methods
      .setFavoriteNumber(user1FavoriteNumber)
      .accounts({
        userInfo: user1InfoPda,
        user: user1.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([user1])
      .rpc();

    // Fetch and verify the user's info
    const userInfo = await program.account.userInfo.fetch(user1InfoPda);
    expect(userInfo.owner.toString()).to.equal(user1.publicKey.toString());
    expect(userInfo.favoriteNumber.toNumber()).to.equal(42);
  });

  it("Allows a second user to set their favorite number", async () => {
    const user2InfoPda = getUserInfoPda(user2.publicKey);
    const user2FavoriteNumber = new anchor.BN(7);

    // User2 sets their favorite number
    await program.methods
      .setFavoriteNumber(user2FavoriteNumber)
      .accounts({
        userInfo: user2InfoPda,
        user: user2.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([user2])
      .rpc();

    // Fetch and verify the user's info
    const userInfo = await program.account.userInfo.fetch(user2InfoPda);
    expect(userInfo.owner.toString()).to.equal(user2.publicKey.toString());
    expect(userInfo.favoriteNumber.toNumber()).to.equal(7);
  });

  it("Allows anyone to view another user's favorite number", async () => {
    const user1InfoPda = getUserInfoPda(user1.publicKey);

    // User2 views User1's favorite number
    await program.methods
      .getFavoriteNumber()
      .accounts({
        userInfo: user1InfoPda,
        inputAddress: user1.publicKey,
      })
      // .signers([user2])
      .rpc();

    // Fetch and verify we get the correct data
    const userInfo = await program.account.userInfo.fetch(user1InfoPda);
    expect(userInfo.favoriteNumber.toNumber()).to.equal(42);
  });

  it("Allows admin to reset a user's favorite number", async () => {
    const user1InfoPda = getUserInfoPda(user1.publicKey);
    const newFavoriteNumber = new anchor.BN(999);

    // Admin resets User1's favorite number
    await program.methods
      .adminResetFavoriteNumber(newFavoriteNumber)
      .accounts({
        state: statePda,
        userInfo: user1InfoPda,
        inputAddress: user1.publicKey,
        admin: admin.publicKey,
      })
      .signers([admin])
      .rpc();

    // Fetch and verify the number was reset
    const userInfo = await program.account.userInfo.fetch(user1InfoPda);
    expect(userInfo.favoriteNumber.toNumber()).to.equal(999);
  });

  it("Prevents non-admin from resetting a user's favorite number", async () => {
    const user1InfoPda = getUserInfoPda(user1.publicKey);
    const newFavoriteNumber = new anchor.BN(123);

    try {
      // User2 tries to reset User1's favorite number
      await program.methods
        .adminResetFavoriteNumber(newFavoriteNumber)
        .accounts({
          state: statePda,
          userInfo: user1InfoPda,
          inputAddress: user1.publicKey,
          admin: user2.publicKey,
        })
        .signers([user2])
        .rpc();
      
      // If we reach here, the test failed
      expect.fail("Expected transaction to fail with unauthorized error");
    } catch (error) {
      // Verify we get the expected error
      expect(error.message).to.include("Unauthorized");
    }

    // Verify the number wasn't changed
    const userInfo = await program.account.userInfo.fetch(user1InfoPda);
    expect(userInfo.favoriteNumber.toNumber()).to.equal(999);
  });

  it("Allows a user to update their own favorite number", async () => {
    const user1InfoPda = getUserInfoPda(user1.publicKey);
    const updatedFavoriteNumber = new anchor.BN(777);

    // User1 updates their favorite number
    await program.methods
      .setFavoriteNumber(updatedFavoriteNumber)
      .accounts({
        userInfo: user1InfoPda,
        user: user1.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([user1])
      .rpc();

    // Fetch and verify the number was updated
    const userInfo = await program.account.userInfo.fetch(user1InfoPda);
    expect(userInfo.favoriteNumber.toNumber()).to.equal(777);
  });
});

