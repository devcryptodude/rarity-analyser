docker stop rarity
docker rm rarity
docker build -t rarity . -f Dockerfile
docker run  --log-driver=journald --restart unless-stopped -d --net=host --name="rarity"  rarity
