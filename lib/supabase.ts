import { createClient } from "@supabase/supabase-js"

const supabaseUrl = "https://qcxhitelibenzdgbefkh.supabase.co"
const supabaseKey =  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjeGhpdGVsaWJlbnpkZ2JlZmtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM4NzEzMTAsImV4cCI6MjA1OTQ0NzMxMH0.5Tf9YJJ1NUz7YOkfsJrJTsrYdQJzQzAWjx-de-qjrhQ"

export const supabase = createClient(supabaseUrl, supabaseKey)
