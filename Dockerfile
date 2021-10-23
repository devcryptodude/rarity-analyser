from node:16
MAINTAINER DevCryptoDude <DevCryptoDude@gmail.com>

COPY . ./
RUN apt-get update || : && apt-get install python -y
RUN npm install
CMD DEBUG=rarity-analyser:* yarn start-dev
