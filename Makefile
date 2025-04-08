#!make

include .env
export $(shell sed 's/=.*//' .env)

DOCKER_COMPOSE_FILE ?= docker-compose.yml

#========================#
#== DEVELOPMENT ==#
#========================#

up:
	docker compose -f ${DOCKER_COMPOSE_FILE} up -d --remove-orphans

down:
	docker compose -f ${DOCKER_COMPOSE_FILE} down

dev:
	npm run dev

# 爬取牧羊人集團下的商品資料
crawl:
	npm run crawl

# 透過AI萃取商品的特徵
extract:
	npm run extract

#========================#
#== RUN ==#
#========================#
run:
	npm run start