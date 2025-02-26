import os
import datetime
import subprocess
import pytz
from git import Repo

# Get the GitHub repository path (GitHub Actions checks out code into this workspace)
REPO_PATH = os.getcwd()

def check_commit_today():
    """Checks if a commit was made today."""
    today = datetime.date.today()
    try:
        commit_date = subprocess.check_output(
            ['git', 'log', '-1', '--format=%cd', '--date=short']
        ).decode().strip()
        return commit_date == str(today)
    except subprocess.CalledProcessError:
        return False  # If no commits are found, assume no commit today

def update_readme():
    """Updates the README file if no commit was made today."""
    repo = Repo(REPO_PATH)
    readme_path = os.path.join(REPO_PATH, 'README.md')

    with open(readme_path, 'a') as f:
        f.write(f"\nNo commit on {datetime.date.today()}.")

    repo.git.add('README.md')
    repo.git.commit('-m', f"Update README: No commit on {datetime.date.today()}")

    # Push changes using GitHub Actions authentication
    origin = repo.remote(name='origin')
    origin.push()

def main():
    """Main function to check and update README if necessary."""
    est_tz = pytz.timezone('US/Eastern')
    current_time = datetime.datetime.now(est_tz)
#and not check_commit_today()
    if current_time.hour == 22 :
        update_readme()

if __name__ == "__main__":
    main()
