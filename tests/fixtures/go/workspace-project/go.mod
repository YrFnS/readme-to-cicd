module workspace-example

go 1.21

use (
    ./api-service
    ./web-frontend
    ./shared-lib
)

require (
    github.com/gin-gonic/gin v1.9.1
    github.com/labstack/echo/v4 v4.11.1
)