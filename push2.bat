@echo off
cd /d "C:\Users\jbint\parawaze-temp"
"C:\Program Files\Git\cmd\git.exe" add -A
"C:\Program Files\Git\cmd\git.exe" commit -m "Fix: lazy Supabase client init for Vercel build"
"C:\Program Files\Git\cmd\git.exe" push origin main
echo PUSH_DONE
