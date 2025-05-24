du -sh *
cat messages.json
du -ch | sort -h
mkdir .data
git prune
git gc
refresh
git prune
rm -rf *
rm -rf .git
git init
