/**
 * Database Connection Check Utility
 * 
 * Use this utility to check the database connection and RPC functions
 */

import { supabase } from './supabase';

/**
 * Checks if the RPC function exists in Supabase
 */
export const checkRpcFunction = async (functionName: string): Promise<boolean> => {
  try {
    // Try to call the RPC function
    const { data, error } = await supabase.rpc(functionName);
    
    // If there's no error about the function not existing, it's likely there
    if (!error || !error.message.includes('does not exist')) {
      return true;
    }
    
    console.error(`RPC function ${functionName} check failed:`, error);
    return false;
  } catch (error) {
    console.error(`Error checking RPC function ${functionName}:`, error);
    return false;
  }
};

/**
 * Checks if the database connection is working
 */
export const checkDatabaseConnection = async (): Promise<boolean> => {
  try {
    // Simple query to check if the connection works
    const { data, error } = await supabase.from('menu_items').select('count').limit(1);
    
    if (error) {
      console.error('Database connection check failed:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error checking database connection:', error);
    return false;
  }
};

/**
 * Instructions for creating the missing RPC function
 */
export const getMissingRpcFunctionSql = (): string => {
  return `
-- Run this SQL in the Supabase SQL Editor to fix missing RPC function:

-- RPC function to get all users (admin only)
CREATE OR REPLACE FUNCTION get_all_users()
RETURNS SETOF users AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('admin', 'superadmin')
  ) THEN
    RAISE EXCEPTION 'Access denied: Only admins can access this function';
  END IF;
  
  -- Return all users
  RETURN QUERY SELECT * FROM users ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
  `;
};