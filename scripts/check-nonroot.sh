PROD_IMAGE="e-commerce-nestjs-app-prod:v1"
PROD_DISTROLESS_IMAGE="e-commerce-nestjs-app-prod_distroless:v1"

COMMAND="console.log(require('os').userInfo())"

echo "Check for $PROD_IMAGE"
docker run --rm "$PROD_IMAGE" -e "$COMMAND"

echo "Check for $PROD_DISTROLESS_IMAGE"
docker run --rm "$PROD_DISTROLESS_IMAGE" -e "$COMMAND"

