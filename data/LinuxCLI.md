# Linux Commands

## Git CLI Commands
```bash
git status                         # see what changed
git add .                          # stage everything
git commit -m "add login feature"  # commit
git push                           # push to GitHub
```
## GoAccess CLI
```bash
goaccess /var/log/nginx/access.log --log-format=COMBINED -c
```

## Fail to Ban CLI Commands
To see currently banned IPs in fail2ban:

List all active jails and their status
```bash
sudo fail2ban-client status
```

See banned IPs for a specific jail (e.g., sshd)
```bash
sudo fail2ban-client status sshd
```

To see all jails at once with banned IPs:
```bash
sudo fail2ban-client status | grep "Jail list" | sed 's/.*://;s/,//g' | xargs -n1 sudo fail2ban-client status
```

To check the log for ban history:
```bash
  sudo grep "Ban" /var/log/fail2ban.log
```
 **Git CLI commands**
