/* =============================================================================
   CHI CMS — connection settings

   Paste the two values from your Supabase project here, then redeploy once.
   After that, everything is edited from the dashboard — this file never
   needs to change again.

   Where to find them:
     Supabase dashboard -> your project -> Settings -> API
       url     = "Project URL"
       anonKey = "Project API keys" -> anon / public

   The anon key is meant to be public: it only allows READING the site
   content. Saving changes requires signing in on the dashboard, which is
   enforced by the database itself (row level security), not by this file.
============================================================================= */
window.CHI_CMS_CONFIG = {
  url: "https://rjzlxlcxukghspdcdwxf.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqemx4bGN4dWtnaHNwZGNkd3hmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA5NjMzMTgsImV4cCI6MjEwNjUzOTMxOH0.B_glf40zH2gLt4G8uObRDjXrAE_zWPxk5eW-WVjGkkI",

  /* The email you create in Supabase -> Authentication -> Users.
     The dashboard asks only for the password and uses this address. */
  adminEmail: "anaamnizamii@gmail.com"
};
