# DiscordJS-Pagination
DiscordJS Pagination helper class that can be used to easily display large amounts of data in embeds

# Example usage

```
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const Pagination = require('../../pagination.js')

module.exports = {
   data: new SlashCommandBuilder()
      .setName('viewmembers')
      .setDescription('View all guild members'),

   async execute(interaction) {
      const { guild, member, client } = interaction;

      let allMembers = await guild.members.fetch().catch(console.error);

      /* Format the data records how you want them displayed (Must be array) */
      let allMembersFormated = allMembers.map(member => {
         return `<@${member.user.id}> - **${member.user.username}#${member.user.discriminator}**`
      })

      /* Create embed to display the data in, style it to your liking */
      const embed = new EmbedBuilder()
         .setTitle('Guild Members')
         .setFooter({ text: member.displayName, iconURL: member.displayAvatarURL({ dynamic: true }) })
         .setTimestamp()
         .setColor(client.globalConfig.botColorTheme);

      /* Create an instance of the Pagination class
         It will automatically respond to the provided interaction
      */
      new Pagination(interaction, allMembersFormated, embed, 5, true);
   }
}
```

<img width="369" alt="Screenshot 2023-04-23 at 11 23 16" src="https://user-images.githubusercontent.com/70685646/233831574-226c04f8-2b9c-4b7a-bd61-87b47900b3af.png">
