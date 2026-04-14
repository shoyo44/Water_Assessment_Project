from fastapi import APIRouter, Depends

from app.core.firebase_auth import verify_firebase_token

router = APIRouter(prefix="/auth", tags=["auth"])

def build_session_payload(decoded_token: dict) -> dict:
    return {
        "uid": decoded_token.get("uid"),
        "email": decoded_token.get("email"),
        "name": decoded_token.get("name"),
        "picture": decoded_token.get("picture"),
        "firebase": {
            "sign_in_provider": decoded_token.get("firebase", {}).get("sign_in_provider"),
        },
    }


@router.get("/session")
async def get_session(decoded_token: dict = Depends(verify_firebase_token)):
    return build_session_payload(decoded_token)


@router.post("/session")
async def create_session(decoded_token: dict = Depends(verify_firebase_token)):
    return build_session_payload(decoded_token)
