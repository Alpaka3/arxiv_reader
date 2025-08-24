#!/usr/bin/env bash
set -euo pipefail

AWS_REGION=ap-northeast-1
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REPO_NAME=ts-app
REPO_URI="$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$REPO_NAME"
TAG=latest
IMAGE="$REPO_URI:$TAG"

# 1) リポジトリ作成（既にあればOK）
aws ecr describe-repositories --repository-names "$REPO_NAME" --region "$AWS_REGION" >/dev/null 2>&1 || \
  aws ecr create-repository --repository-name "$REPO_NAME" --region "$AWS_REGION"

# 2) ECR ログイン
aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin "$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"

# 3) buildx ビルダーを用意（無ければ作成）
docker buildx inspect default >/dev/null 2>&1 || docker buildx create --use

# 4) ビルドして直接 ECR に push（ローカルには残さない）
docker buildx build \
  --platform linux/amd64 \
  -t "$IMAGE" \
  --push .

# 5) 反映確認（digest と push 時刻をチェック）
aws ecr describe-images \
  --repository-name "$REPO_NAME" \
  --image-ids imageTag="$TAG" \
  --region "$AWS_REGION" \
  --query 'imageDetails[0].{pushedAt:imagePushedAt,digest:imageDigest,tags:imageTags}'
