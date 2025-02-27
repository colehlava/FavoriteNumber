use anchor_lang::prelude::*;

declare_id!("CyVHTPGp6C69MNLAbPSJ8vsj9dAJXPg3Dy3aKFEovBNL");

#[program]
pub mod favorite_number {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let state = &mut ctx.accounts.state;
        state.admin = ctx.accounts.admin.key();
        Ok(())
    }

    pub fn set_favorite_number(ctx: Context<SetFavoriteNumber>, favorite_number: u64) -> Result<()> {
        let user_info = &mut ctx.accounts.user_info;
        user_info.owner = ctx.accounts.user.key();
        user_info.favorite_number = favorite_number;
        Ok(())
    }

    pub fn get_favorite_number(_ctx: Context<GetFavoriteNumber>) -> Result<()> {
        // This function doesn't need to do anything as the account data is returned by the RPC
        Ok(())
    }

    pub fn admin_reset_favorite_number(ctx: Context<AdminResetFavoriteNumber>, new_favorite_number: u64) -> Result<()> {
        // Check admin status is handled in the account validation logic
        let user_info = &mut ctx.accounts.user_info;
        user_info.favorite_number = new_favorite_number;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    // #[account(init, payer = admin, space = 8 + 32)]
    #[account(
        init,
        payer = admin,
        space = 8 + 32,
        seeds = [b"state"],
        bump
    )]
    pub state: Account<'info, ProgramState>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SetFavoriteNumber<'info> {
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + 32 + 8,
        seeds = [b"user-info", user.key().as_ref()],
        bump
    )]
    pub user_info: Account<'info, UserInfo>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct GetFavoriteNumber<'info> {
    #[account(
        seeds = [b"user-info", input_address.key().as_ref()],
        bump
    )]
    pub user_info: Account<'info, UserInfo>,

    /// CHECK: The address whose favorite number we want to view
    pub input_address: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct AdminResetFavoriteNumber<'info> {
    #[account(
        seeds = [b"state"],
        bump
    )]
    pub state: Account<'info, ProgramState>,

    #[account(
        mut,
        seeds = [b"user-info", input_address.key().as_ref()],
        bump
    )]
    pub user_info: Account<'info, UserInfo>,

    /// CHECK: The address whose favorite number the admin wants to reset
    pub input_address: AccountInfo<'info>,

    #[account(
        constraint = state.admin == admin.key() @ ErrorCode::Unauthorized
    )]
    pub admin: Signer<'info>,
}

#[account]
pub struct ProgramState {
    pub admin: Pubkey,
}

#[account]
pub struct UserInfo {
    pub owner: Pubkey,
    pub favorite_number: u64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("You are not authorized to perform this action.")]
    Unauthorized,
}

