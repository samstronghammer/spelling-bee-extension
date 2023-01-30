#!/usr/bin/python3
import sys
import re
import json
import os

def file_to_json(filename):
  with open(filename, 'r') as f:
    return json.load(f)

def write_json_file(filename, json_object):
  with open(filename, 'w') as f:
    f.write(json.dumps(json_object, indent=2))

def main():
  arguments = sys.argv[1:]
  if len(arguments) != 2:
    print("Invalid number of arguments.")
    print("Correct usage: python3 build.py chrome|firefox|edge <version #>")
    exit(1)
  if arguments[0] not in ["chrome", "firefox", "edge"]:
    print(f"First argument invalid: '{arguments[0]}'")
    print("Correct usage: python3 build.py chrome|firefox|edge <version #>")
    exit(1)
  version_regex = re.compile(r"^\d+\.\d+$")
  if version_regex.match(arguments[1]) == None:
    print(f"Second argument invalid version number: '{arguments[1]}'")
    print("Correct usage: python3 build.py chrome|firefox|edge <version #>")
    print("Version numbers must look like '1.3' or '17.62'")
    exit(1)
  curr_json = file_to_json("./manifest.json")
  curr_json["manifest_version"] = 3 if arguments[0] == "chrome" or arguments[0] == "edge" else 2
  curr_json["version"] = arguments[1]
  write_json_file("./manifest.json", curr_json)
  os.system(f"zip ./releases/spelling-bee-help-{arguments[0]}-{arguments[1]}.zip -r ./manifest.json ./SpellingBeeHelp.js ./img")

if __name__=="__main__":
  main()
  
