#!/bin/bash

SAVEIFS=$IFS
IFS=$(echo -en "\n\b")
DIR=$1

if [ ! -d $DIR ]; then
    echo "You must specify a directory"
    exit 1
fi

cd $DIR

for file in *; do
	newname=$( echo "$file" | sed 's/^[_0-9 \-]*//' | sed 's/ copia//' | sed 's/ /-/g' )
	cp -v "$file" "$newname"
done

IFS=$SAVEIFS

