CHOCOART — ONLINE SETUP
========================

This version uses Supabase for real online accounts, orders, PostgreSQL and Realtime.
localStorage is used ONLY for the temporary shopping cart and the lamp preference.
Orders and customer accounts are NOT stored in localStorage.

1) CREATE THE SUPABASE PROJECT
------------------------------
- Go to https://supabase.com/
- Create a new project.
- Open SQL Editor.
- Paste ALL contents of SUPABASE_SETUP.sql and run it.

2) CREATE THE ADMIN ACCOUNT
---------------------------
In Supabase:
Authentication > Users > Add user > Create new user

Use:
Email: luffy@chocoart.local
Password: chikagoxluffy

For a simple first setup, disable email confirmation in:
Authentication > Providers > Email > Confirm email = OFF

Copy the new admin user's UUID.
Then, in SQL Editor, run:

update public.profiles
set role='admin', name='ChocoArt Admin'
where id='PASTE_ADMIN_USER_UUID_HERE';

The website login still asks for:
Username: luffy
Password: chikagoxluffy

Internally, "luffy" is mapped to the Supabase Auth email above.

3) CONNECT THE WEBSITE
-----------------------
Open main.js and replace:

const SUPABASE_URL = "YOUR_SUPABASE_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";

with the values from:
Supabase Dashboard > Project Settings > API

Use:
- Project URL
- Publishable/anon public key

NEVER put the Supabase service_role/secret key in main.js.

4) RUN THE WEBSITE
------------------
Do not rely on opening the HTML files with file:// for final testing.
Use a local web server or deploy the folder to a static host.
For example, from the ChocoArt folder:

python -m http.server 5500

Then open:
http://localhost:5500/index.html

5) ONLINE FLOW
--------------
Customer phone/PC
      |
      v
Internet
      |
      v
Supabase Auth + PostgreSQL
      |
      +---- orders table
      |
      +---- profiles table
      |
      v
Admin Dashboard

6) SECURITY NOTES
-----------------
- Customer passwords are handled by Supabase Auth; they are not stored by this site's JavaScript.
- RLS policies prevent normal customers from reading all orders.
- Only a profile with role='admin' can read/update/delete every order.
- Only the authenticated customer who owns an order can insert it.
- The public browser receives only the Supabase public/anon key. Never expose service_role/secret keys.
