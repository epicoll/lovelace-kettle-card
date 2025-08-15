# lovelace-kettle-card
Lovelace card for Palars kettle control with preset modes
# Lovelace Kettle Card

Кастомная карта для управления чайником Palars с предустановленными режимами.

## Установка

### Через HACS (рекомендуется)
1. Открой HACS
2. Перейди в "Frontend"
3. Нажми "Explore & Download Repositories"
4. Найди "Kettle Card"
5. Нажми "Download"

### Вручную
1. Скачай файл `kettle-card.js`
2. Помести его в папку `www/community/lovelace-kettle-card/`
3. Добавь ресурс в конфигурацию:
   ```yaml
   resources:
     - url: /local/community/lovelace-kettle-card/kettle-card.js
       type: module