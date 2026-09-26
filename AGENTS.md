# Project Architecture Rules

- Production builds must fall back to the project's public Lovable Cloud URL and publishable key when injected Vite variables are absent, because missing values crash the entire public site before React mounts.