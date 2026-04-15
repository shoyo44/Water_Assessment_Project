# Project Summary

## Overview

This repository contains a smart water management assessment project named Aqua Campus. It is a two-part application with a Preact frontend and a FastAPI backend backed by MongoDB and Firebase authentication.

## Purpose

The app is designed to help hostel administrators:

- record water usage
- calculate water metrics
- monitor trends
- identify reuse opportunities
- export reports for review

## Current Functional Scope

- Hostel creation with structural details
- Student count tracking
- Category-wise consumption entry
- Automatic total and per-student calculations
- Dashboard summary retrieval
- Daily and weekly analytics
- Rule-based reuse suggestions
- PDF and Excel report generation
- Google sign-in with Firebase-backed session validation
- Live dashboard refresh via WebSocket polling every 3 seconds

## Backend Snapshot

- Framework: FastAPI
- Entry point: `back_end/app/main.py`
- Data access: MongoDB via Motor
- Config: `back_end/.env`
- Main routers:
  - `auth.py`
  - `hostels.py`
  - `calculations.py`
  - `dashboard.py`
  - `charts.py`
  - `reuse.py`
  - `reports.py`

## Frontend Snapshot

- Framework: Preact with TypeScript
- Build tool: Vite
- Main app file: `front_end/src/app.tsx`
- Auth: Firebase web SDK
- Views:
  - Intro
  - Login
  - Setup
  - Add Data
  - Dashboard
  - Analytics
  - Reuse
  - Reports

## Key Calculation Logic

- Total consumption = sum of all saved consumption records
- Per-student usage = total consumption / latest student count
- Reuse potential = 35% of bath + laundry usage
- Efficiency score = `100 - (per_student_l / 2.5)` clamped to `0..100`

## Important Setup Dependencies

- MongoDB connection string
- Firebase frontend config
- Firebase service account JSON for backend token verification
- Python dependencies from `back_end/requirements.txt`
- Node dependencies from `front_end/package.json`

## Important Observation

There is a likely local configuration mismatch:

- backend example config uses port `8000`
- frontend example config uses `http://127.0.0.1:8001`
- frontend code fallback uses `http://127.0.0.1:8000`

This should be aligned before demoing or handing off the project.
