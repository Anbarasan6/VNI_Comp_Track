from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.database import create_all_tables
from app.routers import auth, users, professors, books, requests, letters, faculty_info, reports

app = FastAPI(
    title="VNI Complimentary Copy Tracking System",
    description="Backend API for tracking complimentary book copies sent to professors by VNI Publications",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Exception handlers
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "status_code": exc.status_code},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    # Return errors as a list under 'detail' so frontend can read them
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": [
                {
                    "field": " -> ".join(str(loc) for loc in err["loc"]),
                    "msg": err["msg"],
                    "type": err["type"],
                }
                for err in errors
            ]
        },
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    import traceback
    import logging
    logger = logging.getLogger("uvicorn.error")
    logger.error(f"Unhandled error on {request.method} {request.url}: {exc}")
    logger.error(traceback.format_exc())
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": f"{type(exc).__name__}: {str(exc)}"},
    )


# Startup event: create all tables
@app.on_event("startup")
async def startup_event():
    create_all_tables()


# Root health check
@app.get("/", tags=["Health"])
async def root():
    return {
        "status": "healthy",
        "service": "VNI Complimentary Copy Tracking System",
        "version": "1.0.0",
        "docs": "/api/docs",
    }


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok"}


# Include all routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(professors.router, prefix="/api/professors", tags=["Professors"])
app.include_router(books.router, prefix="/api/books", tags=["Books"])
app.include_router(requests.router, prefix="/api/requests", tags=["Requests"])
app.include_router(letters.router, prefix="/api/letters", tags=["Letters"])
app.include_router(faculty_info.router, prefix="/api/faculty-info", tags=["Faculty Info"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])
