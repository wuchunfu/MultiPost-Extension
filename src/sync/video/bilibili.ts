import { type SyncData, type VideoData } from '../common';

export async function VideoBilibili(data: SyncData) {
  function waitForElement(selector: string, timeout = 10000): Promise<Element> {
    return new Promise((resolve, reject) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver(() => {
        const element = document.querySelector(selector);
        if (element) {
          resolve(element);
          observer.disconnect();
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Element with selector "${selector}" not found within ${timeout}ms`));
      }, timeout);
    });
  }

  async function uploadVideo(file: File): Promise<void> {
    const fileInput = (await waitForElement('input[type=file][multiple="multiple"]')) as HTMLInputElement;

    // 创建一个新的 File 对象，因为某些浏览器可能不允许直接设置 fileInput.files
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    fileInput.files = dataTransfer.files;

    // 触发 change 事件
    const changeEvent = new Event('change', { bubbles: true });
    fileInput.dispatchEvent(changeEvent);

    console.log('视频上传事件已触发');
  }

  async function waitForUploadCompletion(timeout = 600000): Promise<void> {
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        const spans = document.querySelectorAll('span');
        const uploadCompleteElement = Array.from(spans).find(
          (span) => span.textContent && span.textContent.includes('上传完成'),
        );
        if (uploadCompleteElement) {
          clearInterval(checkInterval);
          console.log('视频上传完成');
          resolve();
        }
      }, 1000);

      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error('视频上传超时'));
      }, timeout);
    });
  }

  try {
    const { content, video, title } = data.data as VideoData;
    // 处理视频上传
    if (video) {
      const response = await fetch(video.url);
      const blob = await response.blob();
      const videoFile = new File([blob], video.name, { type: video.type });
      console.log(`视频文件: ${videoFile.name} ${videoFile.type} ${videoFile.size}`);

      await uploadVideo(videoFile);
      console.log('视频上传已初始化');

      try {
        await waitForUploadCompletion();
        console.log('视频上传已完成，继续后续操作');
      } catch (error) {
        console.error('等待视频上传完成时出错:', error);
        return;
      }
    } else {
      console.error('没有视频文件');
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 5000));

    // 处理标题输入
    if (title) {
      const titleInput = (await waitForElement('input.input-val[type="text"][maxlength="80"]')) as HTMLInputElement;
      titleInput.focus();
      titleInput.value = title;
      titleInput.dispatchEvent(new Event('input', { bubbles: true }));
      titleInput.dispatchEvent(new Event('change', { bubbles: true }));
      console.log('标题已输入:', title);
    }

    // 等待简介编辑器出现并输入内容
    const editor = (await waitForElement('div[data-placeholder*="简介"]')) as HTMLDivElement;
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 直接设置文本内容
    const contentToInsert = content || title || '';
    editor.textContent = contentToInsert;

    // 触发 input 事件
    const inputEvent = new InputEvent('input', {
      bubbles: true,
      cancelable: true,
      inputType: 'insertText',
      data: contentToInsert,
    });
    editor.dispatchEvent(inputEvent);

    console.log('简介已输入:', contentToInsert);

    const hotTagContainers = document.querySelectorAll('div[class="hot-tag-container"]');
    const topThreeTags = Array.from(hotTagContainers).slice(0, 3);

    for (const tag of topThreeTags) {
      const tagElement = tag as HTMLDivElement;
      tagElement.click();
      await new Promise((resolve) => setTimeout(resolve, 500)); // 添加短暂延迟，确保点击生效
    }

    console.log('已自动选择前三个热门标签');

    // 如果需要保留换行符，可以使用 innerHTML
    // editor.innerHTML = contentToInsert.replace(/\n/g, '<br>');

    // 如果需要自动发布，可以添加类似的逻辑
    // if (data.auto_publish) {
    //   // 自动发布逻辑
    // }
  } catch (error) {
    console.error('BilibiliVideo 发布过程中出错:', error);
  }
}
