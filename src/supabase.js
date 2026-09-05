import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://veqvniwnrxhrvekbbkjb.supabase.co'
const supabaseKey = 'sb_publishable_WiL8kzQwkCCEQs-mG67O-A_3urPteVa'

export const supabase = createClient(supabaseUrl, supabaseKey)
