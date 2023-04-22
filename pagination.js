const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const ms = require("ms");
const PAGINATION_ACTIVE_DURATION_MINUTES = 3;

module.exports = class Pagination {
   /**
   * Constructor for Pagination class
   * @param {Object} interaction - The interaction object that triggered the pagination
   * @param {Array} data - The array of data to paginate
   * @param {Object} embed - DiscordJS embed to display data in
   * @param {Number} [dataPerPage=10] - The number of items to display per page, default is 10
   * @param {Boolean} [sortButtons=false] - Whether to include sorting buttons, default is false
   */
   constructor(interaction, data, embed, dataPerPage = 10, sortButtons = false) {

      const {client, channel, member} = interaction;

      this.interaction = interaction;
      this.client = client
      this.channel = channel
      this.member = member
      this.data = data
      this.embed = embed
      this.dataPerPage = dataPerPage
      this.buttonRows = []
      this.navButtons = this.setupNavButtons();
      if (sortButtons) this.sortButtons = this.setupSortButtons();

      this.current = 0
      this.json = this.embed.toJSON();
      this.timeout = PAGINATION_ACTIVE_DURATION_MINUTES * 60 * 1000
      this.title = this.embed.data.title
      this.max = (this.data) ? data.length : null;
      this.to;

      this.createPaginationEmbed();
   }

   createPaginationEmbed() {
      const description = (this.data.join('\n')) ? this.data.slice(this.current, this.dataPerPage).join('\n') : null;

      this.interaction.reply({
         embeds: [this.embed
            .setTitle(this.title + ' ' + this.getRange(this.data, this.current, this.dataPerPage))
            .setDescription(description)
         ],
         ephemeral: true,
         components: [...this.buttonRows],
         fetchReply: true,
      }).then(message => {
         this.message = message
         this.createCollector()
      })
   }

   setupNavButtons() {
      let buttonRow = new ActionRowBuilder()
      .addComponents(
         new ButtonBuilder().setCustomId('first').setEmoji('⏪').setStyle(ButtonStyle.Primary).setDisabled(true),
         new ButtonBuilder().setCustomId('prev').setEmoji('◀️').setStyle(ButtonStyle.Primary).setDisabled(true),
         new ButtonBuilder().setCustomId('next').setEmoji('▶️').setStyle(ButtonStyle.Primary),
         new ButtonBuilder().setCustomId('last').setEmoji('⏩').setStyle(ButtonStyle.Primary),
      )
      this.buttonRows.push(buttonRow)
      return buttonRow;
   }

   setupSortButtons() {
      let buttonRow =  new ActionRowBuilder()
         .addComponents(
            new ButtonBuilder().setCustomId('reverse').setLabel('Reverse').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('sort').setLabel('Sort Alphabetically').setStyle(ButtonStyle.Secondary),
         )
      this.buttonRows.push(buttonRow)
      return buttonRow;
   }

   first() {
      if (this.current === 0) return;
      this.current = 0;
      return new EmbedBuilder(this.json)
         .setTitle(this.title + ' ' + this.getRange(this.data, this.current, this.dataPerPage))
         .setDescription(this.data.slice(this.current, this.current + this.dataPerPage).join('\n'));
   }

   prev() {
      if (this.current === 0) return;
      this.current -= this.dataPerPage;
      if (this.current < 0) this.current = 0;
      return new EmbedBuilder(this.json)
         .setTitle(this.title + ' ' + this.getRange(this.data, this.current, this.dataPerPage))
         .setDescription(this.data.slice(this.current, this.current + this.dataPerPage).join('\n'));
   }

   next() {
      const cap = this.max - (this.max % this.dataPerPage);
      if (this.current === cap || this.current + this.dataPerPage === this.max) return;
      this.current += this.dataPerPage;
      if (this.current >= this.max) this.current = cap;
      const max = (this.current + this.dataPerPage >= this.max) ? this.max : this.current + this.dataPerPage;
      return new EmbedBuilder(this.json)
         .setTitle(this.title + ' ' + this.getRange(this.data, this.current, this.dataPerPage))
         .setDescription(this.data.slice(this.current, max).join('\n'));
   }

   last() {
      const cap = this.max - (this.max % this.dataPerPage);
      if (this.current === cap || this.current + this.dataPerPage === this.max) return;
      this.current = cap;
      if (this.current === this.max) this.current -= this.dataPerPage;
      return new EmbedBuilder(this.json)
         .setTitle(this.title + ' ' + this.getRange(this.data, this.current, this.dataPerPage))
         .setDescription(this.data.slice(this.current, this.max).join('\n'));
   }

   reverse() {
      this.data.reverse();
      return new EmbedBuilder(this.json)
         .setTitle(this.title + ' ' + this.getRange(this.data, this.current, this.dataPerPage))
         .setDescription(this.data.slice(this.current, this.current + this.dataPerPage).join('\n'));
   }

   sort() {
      this.data.sort()
      return new EmbedBuilder(this.json)
         .setTitle(this.title + ' ' + this.getRange(this.data, this.current, this.dataPerPage))
         .setDescription(this.data.slice(this.current, this.current + this.dataPerPage).join('\n'));
   }

   delete() {
      this.collector.stop();
   }
 
   createCollector() {
      const collector = this.message.createMessageComponentCollector({ componentType: ComponentType.Button, time: this.timeout });

      collector.on('collect', i => {
         if (i.user.id !== this.member.id) {
            return i.reply({ content: `These buttons aren't for you!`, ephemeral: true });
         }
         
         // Calling respective methods based on clicked button customId
         let newEmbed = this[i.customId]()
         if (i.customId === 'delete') return

         this.updateButtons()

         i.update({
            embeds: [newEmbed],
            components: [...this.buttonRows]
         }).catch(console.error)
            
      });

      collector.on('end', () => {
         this.interaction.editReply({
            components: [],
            ephemeral: true,
         })
      });

      this.collector = collector;
   }

   getRange(arr, current, interval) {
      const max = (arr.length > current + interval) ? current + interval : arr.length;
      current = current + 1;
      const range = (arr.length == 1 || arr.length == current || interval == 1) ? `[${current}]` : `[${current} - ${max}]`;
      this.to = max
      return range;
   }

   updateButtons() {
      let shouldBeDisabled = []
      for (let i = 0; i < this.navButtons.components.length; i++) shouldBeDisabled.push(false)
      if (this.current === 0) {
         shouldBeDisabled[0] = true
         shouldBeDisabled[1] = true
      }
      if (this.to >= this.data.length) {
         shouldBeDisabled[2] = true
         shouldBeDisabled[3] = true
      }

      this.navButtons.components = this.navButtons.components.map((b, i) => {
         if (shouldBeDisabled[i]) return b.setDisabled(true)
         return b.setDisabled(false)
      })
   }
}