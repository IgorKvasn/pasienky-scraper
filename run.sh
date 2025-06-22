# docker build --progress=plain --no-cache -f docs/dev-pasienky/Dockerfile .

cd docs/dev-pasienky
docker compose up --build --force-recreate