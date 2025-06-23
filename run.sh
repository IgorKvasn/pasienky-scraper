# docker build --progress=plain --no-cache -f docs/dev-pasienky/Dockerfile .

cd docs/dev-pasienky

# vycitenie disku - ak je malo miesta na disku, moze build spadnut
#sudo apt-get clean
docker image prune -f
docker container prune -f

docker compose up --build --force-recreate -d