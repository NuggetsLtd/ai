#!/bin/sh
AWS_PROFILE=nuggets_default aws ecr get-login-password --region eu-west-1 | docker login --username AWS --password-stdin 454245708275.dkr.ecr.eu-west-1.amazonaws.com
