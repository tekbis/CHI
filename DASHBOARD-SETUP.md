# CHI Website Dashboard — Setup

You only do this once, and it takes about 10 minutes. After that you edit the
website from `yoursite.com/admin/` and changes go live in seconds.

Everything here is free. Supabase's free tier is far more than this site needs.

---

## Step 1 — Create a Supabase project

1. Go to **https://supabase.com** and sign up (GitHub or email, no card needed).
2. Click **New project**.
   - **Name:** anything, e.g. `chi-website`
   - **Database Password:** let it generate one. You will not need it again,
     but save it somewhere just in case.
   - **Region:** pick the one closest to Maryland (e.g. `East US`).
3. Wait a minute or two while it sets up.

---

## Step 2 — Create the content table

1. In the left sidebar click **SQL Editor**, then **New query**.
2. Open the file `supabase-setup.sql` from your website folder, copy the whole
   thing, and paste it into the editor.
3. Click **Run**.

You should see "Success. No rows returned". That is correct — it created the
table, the security rules and the image storage.

---

## Step 3 — Create your login

1. Left sidebar → **Authentication** → **Users** → **Add user** → **Create new user**.
2. Fill in:
   - **Email:** `anaamnizamii@gmail.com`
     *(if you use a different address, change it in `assets/cms-config.js` too)*
   - **Password:** whatever you want your dashboard password to be
   - Tick **Auto Confirm User**
3. Click **Create user**.
4. Still under **Authentication**, open **Sign In / Providers** and turn
   **off** "Allow new users to sign up". This keeps yours the only account that
   can ever edit the site.

---

## Step 4 — Connect the website

1. Left sidebar → **Project Settings** (gear icon) → **API**.
2. Copy these two values:
   - **Project URL** — looks like `https://abcdefgh.supabase.co`
   - **anon public** key under *Project API keys* — a long string starting `eyJ…`
3. Open `assets/cms-config.js` in your website folder and paste them in:

```js
window.CHI_CMS_CONFIG = {
  url: "https://abcdefgh.supabase.co",
  anonKey: "eyJhbGciOi...",
  adminEmail: "anaamnizamii@gmail.com"
};
```

4. Save the file.

**Is it safe to put that key in the file?** Yes. The anon key is designed to be
public and only allows *reading* the website content — which is already visible
to anyone looking at your site. Saving changes requires your password, and that
rule is enforced by Supabase's database, not by anything in the page.

---

## Step 5 — Deploy

Drag the website folder to Netlify as usual.

Then open **https://yoursite.com/admin/**, enter your password, and you are in.

The first time you open it, the dashboard loads the text and images currently
on your site, so nothing looks empty. Nothing is written to the database until
you press **Save & publish**.

---

## Using the dashboard

- **Left** — the sections of your site. Click one to edit it.
- **Middle** — the fields. Type and the preview updates instantly.
- **Right** — your real website, live. Toggle Desktop/Mobile to check both.
- **Save & publish** — pushes it live. Visitors see it within seconds.
- **Undo changes** — throws away everything since your last save.

### What you can change
Phone number, logo, every heading and paragraph, all photos, service names and
descriptions, the four service regions and their map pins, trust badges, process
steps, footer text, and the page title/description used by Google.

### Reviews and FAQ
These two can have entries **added, reordered and deleted** — use **+ Add
another**, the ↑ ↓ arrows and ✕.

### Images
Click **Upload new image**, pick a file, done. It is stored in Supabase and used
immediately. Keep images under 5 MB; around 1600px wide is plenty.

---

## Good to know

**Changes appear within seconds.** Returning visitors may see the previous
version for one page load, because the site keeps a local copy so it can paint
instantly; it refreshes in the background and is correct from then on.

**If Supabase is ever down,** your website keeps working and shows the content
it shipped with. The dashboard is the only thing that stops working.

**Things the dashboard deliberately does not change:** page layout, colours,
fonts, and adding or removing whole sections or services. Those are design
changes to the site itself.

**Forgot your password?** Supabase → Authentication → Users → click your user →
**Reset password**.

---

## If something goes wrong

| What you see | What it means |
|---|---|
| "Not connected yet" on the login screen | Step 4 is incomplete — the URL/key are still placeholders |
| "Invalid login credentials" | Wrong password, or the email here differs from the one in `cms-config.js` |
| "Could not read the content table" | Step 2 did not run. Re-run `supabase-setup.sql` |
| "Nothing was saved — check that row id = 1 exists" | Re-run `supabase-setup.sql`; it recreates the row |
| Dashboard works, website does not update | Hard-refresh the site (Ctrl/Cmd + Shift + R) |
