<script lang="ts">
	import { getContext } from "svelte";
	import StoryContainer from "./story/StoryContainer.svelte";
	import Story from "./story/Story.svelte";

	const copy = getContext("copy");
	const data = getContext("data");
</script>

<svelte:boundary onerror={(e) => console.error(e)}>
	<StoryContainer>
		<Story {copy} />
		<!-- <Story {copy} darkMode /> -->
	</StoryContainer>
</svelte:boundary>
